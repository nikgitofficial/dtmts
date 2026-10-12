import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db.js";
import { SESSION_SQL, sessionFilter } from "../repositories/session.repository.js";

const idSchema = z.string().uuid();
const historySchema = z.object({ hours: z.coerce.number().int().min(1).max(48).default(6) });

const sessionsSchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(["all", "live", "ended"]).default("all"),
  days: z.coerce.number().int().min(0).max(365).default(7), // 0 = all time
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function live(_req: Request, res: Response) {
  const { rows } = await pool.query(
    `SELECT d.id, d.name, d.phone, d.plate_number AS "plateNumber", d.vehicle_brand AS "vehicleBrand", d.vehicle_type AS "vehicleType",
            d.route_from AS "routeFrom", d.route_to AS "routeTo", d.capacity_kg::float8 AS "capacityKg",
            d.status,
            d.route_from_lat AS "routeFromLat", d.route_from_lng AS "routeFromLng",
            d.route_to_lat AS "routeToLat", d.route_to_lng AS "routeToLng",
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
}

export async function history(req: Request, res: Response) {
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
}

export async function sessions(req: Request, res: Response) {
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
}

// CSV: guards against spreadsheet formula injection from device names
const csvCell = (v: unknown) => {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=@\t\r]|^[+-](?!\d)/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportSessions(req: Request, res: Response) {
  const p = sessionsSchema.safeParse(req.query);
  if (!p.success) return res.status(400).json({ error: "Invalid query" });
  const { where, params } = sessionFilter(res.locals.userId, p.data);
  const { rows } = await pool.query(`${SESSION_SQL} WHERE ${where} ORDER BY s.started_at DESC LIMIT 2000`, params);
  const head = ["Driver", "Plate", "Truck brand", "Vehicle type", "Route", "Phone", "Email", "Device name", "Brand", "Model", "OS", "App version",
    "IP address", "Started", "Ended", "End reason", "Duration (min)", "Distance (km)", "Max speed (km/h)", "GPS points"];
  const lines = rows.map((r) => [
    r.driverName, r.plateNumber, r.vehicleBrand, r.vehicleType, `${r.routeFrom} → ${r.routeTo}`,
    r.phone, r.email, r.deviceName, r.deviceBrand, r.deviceModel,
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
}