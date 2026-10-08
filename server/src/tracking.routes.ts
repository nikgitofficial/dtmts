import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { pool } from "./db.js";
import { requireAuth } from "./middleware.js";
import { requireDriver } from "./driverAuth.routes.js";

/* ───────────────────────── Driver (mobile) ───────────────────────── */

export const driverTracking = Router();

const driverLimiter = rateLimit({
  windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (_req, res) => `d:${res.locals.driver.id}`,
  message: { error: "Too many location updates" },
});

const point = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).nullish(),
  speed: z.number().min(0).max(100).nullish(),     // m/s
  heading: z.number().min(0).max(360).nullish(),
  recordedAt: z.string().datetime({ offset: true }),
});
// Keep batches small: the global JSON body limit is 10kb
const batchSchema = z.object({ points: z.array(point).min(1).max(40) });

// NEW: device info sent by the app when sharing starts
const devStr = z.string().trim().max(80).nullish();
const startSchema = z.object({
  device: z.object({
    name: devStr, brand: devStr, model: devStr, osName: devStr, osVersion: devStr, appVersion: devStr,
  }).optional(),
});

// NEW: now also logs a session row (device, IP) and closes any session left open
driverTracking.post("/tracking/start", requireDriver, async (req, res) => {
  const dev: NonNullable<z.infer<typeof startSchema>["device"]> =
    startSchema.safeParse(req.body ?? {}).data?.device ?? {};
  const ip = (req.ip ?? "").replace(/^::ffff:/, "").slice(0, 45) || null;
  const driverId = res.locals.driver.id as string;

  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(
      "UPDATE tracking_sessions SET ended_at=now(), end_reason='replaced' WHERE driver_id=$1 AND ended_at IS NULL",
      [driverId],
    );
    await c.query(
      `INSERT INTO tracking_sessions
         (driver_id, device_name, device_brand, device_model, os_name, os_version, app_version, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [driverId, dev.name ?? null, dev.brand ?? null, dev.model ?? null, dev.osName ?? null,
       dev.osVersion ?? null, dev.appVersion ?? null, ip],
    );
    await c.query("UPDATE drivers SET sharing_since=now() WHERE id=$1", [driverId]);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
  res.json({ ok: true });
});

// NEW: now also closes the open session
driverTracking.post("/tracking/stop", requireDriver, async (_req, res) => {
  const id = res.locals.driver.id;
  await pool.query(
    "UPDATE tracking_sessions SET ended_at=now(), end_reason='driver' WHERE driver_id=$1 AND ended_at IS NULL",
    [id],
  );
  await pool.query("UPDATE drivers SET sharing_since=NULL WHERE id=$1", [id]);
  res.json({ ok: true });
});

driverTracking.post("/location", requireDriver, driverLimiter, async (req, res) => {
  const p = batchSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid location data" });

  // Drop impossible timestamps but keep offline backlogs up to 24h old
  const now = Date.now();
  const pts = p.data.points
    .filter((x) => { const t = Date.parse(x.recordedAt); return t <= now + 120_000 && t >= now - 24 * 3600_000; })
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  if (!pts.length) return res.json({ ok: true, accepted: 0 });

  const driverId = res.locals.driver.id as string;
  const col = <K extends "lat" | "lng" | "accuracy" | "speed" | "heading">(k: K) => pts.map((x) => x[k] ?? null);

  await pool.query(
    `INSERT INTO location_points (driver_id, lat, lng, accuracy, speed, heading, recorded_at)
     SELECT $1, * FROM unnest($2::float8[], $3::float8[], $4::float8[], $5::float8[], $6::float8[], $7::timestamptz[])
     ON CONFLICT (driver_id, recorded_at) DO NOTHING`,
    [driverId, col("lat"), col("lng"), col("accuracy"), col("speed"), col("heading"), pts.map((x) => x.recordedAt)],
  );

  // Latest position only moves forward in time
  const last = pts[pts.length - 1];
if (!last) return res.json({ ok: true, accepted: 0 });
  await pool.query(
    `INSERT INTO driver_locations (driver_id, lat, lng, accuracy, speed, heading, recorded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (driver_id) DO UPDATE SET
       lat=EXCLUDED.lat, lng=EXCLUDED.lng, accuracy=EXCLUDED.accuracy, speed=EXCLUDED.speed,
       heading=EXCLUDED.heading, recorded_at=EXCLUDED.recorded_at, updated_at=now()
     WHERE driver_locations.recorded_at < EXCLUDED.recorded_at`,
    [driverId, last.lat, last.lng, last.accuracy ?? null, last.speed ?? null, last.heading ?? null, last.recordedAt],
  );
  res.json({ ok: true, accepted: pts.length });
});

/* ───────────────────────── Admin (web) ───────────────────────── */

export const tracking = Router();
tracking.use(requireAuth);
tracking.use(rateLimit({
  windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (_req, res) => `u:${res.locals.userId}`,
}));
tracking.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

tracking.get("/live", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT d.id, d.name, d.phone, d.plate_number AS "plateNumber", d.vehicle_type AS "vehicleType",
            d.route_from AS "routeFrom", d.route_to AS "routeTo", d.capacity_kg::float8 AS "capacityKg",
            d.status,
(d.sharing_since IS NOT NULL AND d.status = 'active'
  AND now() - GREATEST(d.sharing_since, l.recorded_at) < interval '30 minutes') AS sharing,
            d.sharing_since AS "sharingSince",
            l.lat, l.lng, l.accuracy, l.speed, l.heading, l.recorded_at AS "recordedAt",
            extract(epoch FROM (now() - l.recorded_at))::float8 AS "ageSec"
       FROM drivers d LEFT JOIN driver_locations l ON l.driver_id = d.id
      WHERE d.owner_id = $1
      ORDER BY d.name`,
    [res.locals.userId],
  );
  res.json({ drivers: rows });
});

const idSchema = z.string().uuid();
const historySchema = z.object({ hours: z.coerce.number().int().min(1).max(48).default(6) });

tracking.get("/:id/history", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  const q = historySchema.safeParse(req.query);
  if (!id.success || !q.success) return res.status(404).json({ error: "Not found" });
  const bucket = Math.max(5, (q.data.hours * 3600) / 1500);
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (bucket) lat, lng, speed, recorded_at AS "recordedAt" FROM (
       SELECT p.lat, p.lng, p.speed, p.recorded_at,
              floor(extract(epoch FROM p.recorded_at) / $3::float8)::bigint AS bucket
         FROM location_points p JOIN drivers d ON d.id = p.driver_id
        WHERE p.driver_id = $1 AND d.owner_id = $2
          AND p.recorded_at > now() - make_interval(hours => $4::int)
     ) s ORDER BY bucket, "recordedAt" DESC`,
    [id.data, res.locals.userId, bucket, q.data.hours],
  );
  res.json({ points: rows });
});

/* ───────── NEW: Session logs ───────── */

const sessionsSchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(["all", "live", "ended"]).default("all"),
  days: z.coerce.number().int().min(0).max(365).default(7), // 0 = all time
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function sessionFilter(userId: string, f: { q?: string; status: string; days: number }) {
  const where = ["d.owner_id = $1"];
  const params: unknown[] = [userId];
  if (f.q) {
    params.push(`%${f.q.replace(/[\\%_]/g, "\\$&")}%`);
    const n = `$${params.length}`;
    where.push(`(d.name ILIKE ${n} OR d.plate_number ILIKE ${n} OR d.phone ILIKE ${n} OR s.device_name ILIKE ${n}
      OR s.device_brand ILIKE ${n} OR s.device_model ILIKE ${n} OR s.ip_address ILIKE ${n})`);
  }
  if (f.status === "live") where.push("s.ended_at IS NULL");
  if (f.status === "ended") where.push("s.ended_at IS NOT NULL");
  if (f.days > 0) {
    params.push(f.days);
    where.push(`s.started_at > now() - make_interval(days => $${params.length}::int)`);
  }
  return { where: where.join(" AND "), params };
}

// Per-session stats come from the breadcrumb points recorded during the session (kept 30 days)
const SESSION_SQL = `
  SELECT s.id, s.driver_id AS "driverId", d.name AS "driverName", d.phone, d.email,
         d.plate_number AS "plateNumber", d.vehicle_type AS "vehicleType",
         d.route_from AS "routeFrom", d.route_to AS "routeTo",
         s.started_at AS "startedAt", s.ended_at AS "endedAt", s.end_reason AS "endReason",
         s.device_name AS "deviceName", s.device_brand AS "deviceBrand", s.device_model AS "deviceModel",
         s.os_name AS "osName", s.os_version AS "osVersion", s.app_version AS "appVersion",
         s.ip_address AS "ipAddress",
         extract(epoch FROM (COALESCE(s.ended_at, now()) - s.started_at))::float8 AS "durationSec",
         st.points, st.distance_km AS "distanceKm", st.max_speed AS "maxSpeed",
         l.recorded_at AS "lastSeenAt"
    FROM tracking_sessions s
    JOIN drivers d ON d.id = s.driver_id
    LEFT JOIN driver_locations l ON l.driver_id = s.driver_id
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS points,
             max(speed)::float8 AS max_speed,
             COALESCE(sum(CASE WHEN plat IS NULL THEN 0 ELSE
               12742 * asin(least(1, sqrt(
                 power(sin(radians(lat - plat) / 2), 2) +
                 cos(radians(plat)) * cos(radians(lat)) * power(sin(radians(lng - plng) / 2), 2)
               ))) END), 0)::float8 AS distance_km
        FROM (
          SELECT p.lat, p.lng, p.speed,
                 lag(p.lat) OVER w AS plat, lag(p.lng) OVER w AS plng
            FROM location_points p
           WHERE p.driver_id = s.driver_id
             AND p.recorded_at >= s.started_at
             AND p.recorded_at <= COALESCE(s.ended_at, now())
          WINDOW w AS (ORDER BY p.recorded_at)
        ) x
    ) st ON true`;

tracking.get("/sessions", async (req, res) => {
  const p = sessionsSchema.safeParse(req.query);
  if (!p.success) return res.status(400).json({ error: "Invalid query" });
  const { page, limit, ...f } = p.data;
  const { where, params } = sessionFilter(res.locals.userId, f);
  const [list, sum] = await Promise.all([
    pool.query(
      `${SESSION_SQL} WHERE ${where} ORDER BY s.started_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    ),
    pool.query(
      `SELECT count(*)::int AS total,
              (count(*) FILTER (WHERE s.ended_at IS NULL))::int AS live,
              count(DISTINCT s.driver_id)::int AS drivers,
              COALESCE(avg(extract(epoch FROM (s.ended_at - s.started_at))) FILTER (WHERE s.ended_at IS NOT NULL), 0)::float8 AS "avgSec"
         FROM tracking_sessions s JOIN drivers d ON d.id = s.driver_id WHERE ${where}`,
      params,
    ),
  ]);
  res.json({ sessions: list.rows, total: sum.rows[0].total, summary: sum.rows[0] });
});

// CSV: guards against spreadsheet formula injection from device names
const csvCell = (v: unknown) => {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=@\t\r]|^[+-](?!\d)/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

tracking.get("/sessions/export", async (req, res) => {
  const p = sessionsSchema.safeParse(req.query);
  if (!p.success) return res.status(400).json({ error: "Invalid query" });
  const { where, params } = sessionFilter(res.locals.userId, p.data);
  const { rows } = await pool.query(`${SESSION_SQL} WHERE ${where} ORDER BY s.started_at DESC LIMIT 2000`, params);
  const head = ["Driver", "Plate", "Phone", "Email", "Device name", "Brand", "Model", "OS", "App version",
    "IP address", "Started", "Ended", "End reason", "Duration (min)", "Distance (km)", "Max speed (km/h)", "GPS points"];
  const lines = rows.map((r) => [
    r.driverName, r.plateNumber, r.phone, r.email, r.deviceName, r.deviceBrand, r.deviceModel,
    [r.osName, r.osVersion].filter(Boolean).join(" "), r.appVersion, r.ipAddress,
    r.startedAt, r.endedAt, r.endedAt ? r.endReason : "live",
    (r.durationSec / 60).toFixed(1), r.points ? r.distanceKm.toFixed(2) : "",
    r.maxSpeed == null ? "" : Math.round(r.maxSpeed * 3.6), r.points,
  ].map(csvCell).join(","));
  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="session-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
  });
  res.send("\uFEFF" + [head.join(","), ...lines].join("\r\n"));
});

/* NEW: Close sessions whose driver went silent (phone died, app killed, no network) */
export function startSessionSweeper() {
  const run = () =>
    pool.query(
      `UPDATE tracking_sessions s
          SET ended_at = GREATEST(s.started_at, COALESCE(l.recorded_at, s.started_at)), end_reason = 'timeout'
         FROM drivers d LEFT JOIN driver_locations l ON l.driver_id = d.id
        WHERE d.id = s.driver_id AND s.ended_at IS NULL
          AND now() - GREATEST(s.started_at, COALESCE(l.recorded_at, s.started_at)) > interval '30 minutes'`,
    ).catch((e) => console.error("sweeper", e));
  run();
  setInterval(run, 5 * 60_000).unref();
}

/* ───────────────────────── Retention ───────────────────────── */

export function startRetentionJob(days = 30) {
  const run = () =>
    pool.query("DELETE FROM location_points WHERE recorded_at < now() - make_interval(days => $1::int)", [days])
      .catch((e) => console.error("retention", e));
  run();
  setInterval(run, 6 * 3600_000).unref();
}