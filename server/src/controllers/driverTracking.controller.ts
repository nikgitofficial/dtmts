import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db.js";

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

const devStr = z.string().trim().max(80).nullish();
const startSchema = z.object({
  device: z.object({
    name: devStr, brand: devStr, model: devStr, osName: devStr, osVersion: devStr, appVersion: devStr,
  }).optional(),
});

// Logs a session row (device, IP) and closes any session left open
export async function start(req: Request, res: Response) {
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
}

export async function stop(_req: Request, res: Response) {
  const id = res.locals.driver.id;
  await pool.query(
    "UPDATE tracking_sessions SET ended_at=now(), end_reason='driver' WHERE driver_id=$1 AND ended_at IS NULL",
    [id],
  );
  await pool.query("UPDATE drivers SET sharing_since=NULL WHERE id=$1", [id]);
  res.json({ ok: true });
}

export async function location(req: Request, res: Response) {
  const p = batchSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid location data" });

  // Drop impossible timestamps but keep offline backlogs up to 24h old
  const now = Date.now();
  const pts = p.data.points
    .filter((x) => { const t = Date.parse(x.recordedAt); return t <= now + 120_000 && t >= now - 24 * 3600_000; })
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  const last = pts[pts.length - 1];
  if (!last) return res.json({ ok: true, accepted: 0 });

  const driverId = res.locals.driver.id as string;
  const col = <K extends "lat" | "lng" | "accuracy" | "speed" | "heading">(k: K) => pts.map((x) => x[k] ?? null);

  await pool.query(
    `INSERT INTO location_points (driver_id, lat, lng, accuracy, speed, heading, recorded_at)
     SELECT $1, * FROM unnest($2::float8[], $3::float8[], $4::float8[], $5::float8[], $6::float8[], $7::timestamptz[])
     ON CONFLICT (driver_id, recorded_at) DO NOTHING`,
    [driverId, col("lat"), col("lng"), col("accuracy"), col("speed"), col("heading"), pts.map((x) => x.recordedAt)],
  );

  // Latest position only moves forward in time
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
}