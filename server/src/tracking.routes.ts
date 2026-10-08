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

driverTracking.post("/tracking/start", requireDriver, async (_req, res) => {
  await pool.query("UPDATE drivers SET sharing_since=now() WHERE id=$1", [res.locals.driver.id]);
  res.json({ ok: true });
});

driverTracking.post("/tracking/stop", requireDriver, async (_req, res) => {
  await pool.query("UPDATE drivers SET sharing_since=NULL WHERE id=$1", [res.locals.driver.id]);
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

/* ───────────────────────── Retention ───────────────────────── */

export function startRetentionJob(days = 30) {
  const run = () =>
    pool.query("DELETE FROM location_points WHERE recorded_at < now() - make_interval(days => $1::int)", [days])
      .catch((e) => console.error("retention", e));
  run();
  setInterval(run, 6 * 3600_000).unref();
}