import { Router, type Request } from "express";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { pool } from "./db.js";
import { geocode } from "./geocode.js";
import { requireAuth } from "./middleware.js";

export const drivers = Router();
drivers.use(requireAuth);

const COLS = `id, name, email, phone, route_from AS "routeFrom", route_to AS "routeTo",
  route_from_lat AS "routeFromLat", route_from_lng AS "routeFromLng",
  route_to_lat AS "routeToLat", route_to_lng AS "routeToLng",
  pin_code AS "pinCode", plate_number AS "plateNumber",
  vehicle_brand AS "vehicleBrand", vehicle_type AS "vehicleType",
  capacity_kg::float8 AS "capacityKg", status, created_at AS "createdAt", updated_at AS "updatedAt"`;

// Whitelist: request field -> column (keeps dynamic UPDATE safe)
const FIELD_TO_COL = {
  name: "name", email: "email", phone: "phone", routeFrom: "route_from", routeTo: "route_to",
  plateNumber: "plate_number", vehicleBrand: "vehicle_brand", vehicleType: "vehicle_type",
  capacityKg: "capacity_kg", status: "status",
  // set by the server only (not accepted from the client, updateSchema is strict)
  routeFromLat: "route_from_lat", routeFromLng: "route_from_lng",
  routeToLat: "route_to_lat", routeToLng: "route_to_lng",
} as const;

// PH mobile -> normalized +639XXXXXXXXX
const phone = z.string().trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(\+?63|0)9\d{9}$/, "Enter a valid PH mobile number (e.g. 0917 123 4567)"))
  .transform((s) => "+63" + s.replace(/^(\+?63|0)/, ""));

const plate = z.string().trim()
  .transform((s) => s.toUpperCase().replace(/\s+/g, " "))
  .pipe(z.string().regex(/^[A-Z0-9 -]{5,10}$/, "Invalid plate number"));

const place = (label: string) => z.string().trim().min(1, `${label} is required`).max(80);

const driverSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  phone,
  routeFrom: place("Origin"),
  routeTo: place("Destination"),
  plateNumber: plate,
  vehicleBrand: z.string().trim().max(40).nullish(),
  vehicleType: z.string().trim().max(40).nullish(),
  capacityKg: z.number().positive("Capacity must be greater than 0").max(100_000),
  status: z.enum(["active", "inactive"]).default("active"),
});
const updateSchema = driverSchema.partial().strict();

const idSchema = z.string().uuid();
const listSchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// 6-digit PIN from a CSPRNG (not Math.random)
const genPin = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

function conflict(constraint?: string) {
  if (constraint === "drivers_owner_email_unique") return "A driver with this email already exists";
  if (constraint === "drivers_owner_plate_unique") return "A driver with this plate number already exists";
  return "Duplicate driver";
}
const uid = (req: Request) => req.res!.locals.userId as string;

// LIST (search + pagination)
drivers.get("/", async (req, res) => {
  const p = listSchema.safeParse(req.query);
  if (!p.success) return res.status(400).json({ error: "Invalid query" });
  const { q, page, limit } = p.data;
  const like = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : null;
  const { rows } = await pool.query(
    `SELECT ${COLS}, count(*) OVER()::int AS total FROM drivers
     WHERE owner_id=$1 AND ($2::text IS NULL OR name ILIKE $2 OR email ILIKE $2
       OR plate_number ILIKE $2 OR vehicle_brand ILIKE $2 OR route_from ILIKE $2 OR route_to ILIKE $2)
     ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
    [uid(req), like, limit, (page - 1) * limit],
  );
  const total = rows[0]?.total ?? 0;
  res.json({ drivers: rows.map(({ total: _t, ...d }) => d), total, page, limit });
});

// READ
drivers.get("/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Not found" });
  const { rows } = await pool.query(`SELECT ${COLS} FROM drivers WHERE id=$1 AND owner_id=$2`, [id.data, uid(req)]);
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  res.json({ driver: rows[0] });
});

// CREATE (auto-generates a unique PIN, retrying on the rare collision)
drivers.post("/", async (req, res) => {
  const p = driverSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message ?? "Invalid input" });
  const d = p.data;
  const [from, to] = await Promise.all([geocode(d.routeFrom), geocode(d.routeTo)]);
  for (let i = 0; i < 5; i++) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO drivers (owner_id,name,email,phone,route_from,route_to,pin_code,plate_number,
           vehicle_brand,vehicle_type,capacity_kg,status,route_from_lat,route_from_lng,route_to_lat,route_to_lng)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING ${COLS}`,
        [uid(req), d.name, d.email, d.phone, d.routeFrom, d.routeTo, genPin(), d.plateNumber,
         d.vehicleBrand ?? null, d.vehicleType ?? null, d.capacityKg, d.status,
         from?.lat ?? null, from?.lng ?? null, to?.lat ?? null, to?.lng ?? null],
      );
      return res.status(201).json({ driver: rows[0] });
    } catch (e: any) {
      if (e.code !== "23505") throw e;
      if (e.constraint === "drivers_pin_unique") continue;
      return res.status(409).json({ error: conflict(e.constraint) });
    }
  }
  res.status(503).json({ error: "Could not generate a unique PIN. Try again." });
});

// UPDATE (partial)
drivers.patch("/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Not found" });
  const p = updateSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message ?? "Invalid input" });

  const entries = Object.entries(p.data).filter(([, v]) => v !== undefined) as [keyof typeof FIELD_TO_COL, unknown][];
  if (!entries.length) return res.status(400).json({ error: "Nothing to update" });

  // Re-pin the map whenever a route end changes (stale coordinates are cleared if lookup fails)
  if (p.data.routeFrom !== undefined) {
    const g = await geocode(p.data.routeFrom);
    entries.push(["routeFromLat", g?.lat ?? null], ["routeFromLng", g?.lng ?? null]);
  }
  if (p.data.routeTo !== undefined) {
    const g = await geocode(p.data.routeTo);
    entries.push(["routeToLat", g?.lat ?? null], ["routeToLng", g?.lng ?? null]);
  }

  const sets = entries.map(([k], i) => `${FIELD_TO_COL[k]}=$${i + 1}`);
  const values = entries.map(([, v]) => v);
  try {
    const { rows } = await pool.query(
      `UPDATE drivers SET ${sets.join(", ")}, updated_at=now()
       WHERE id=$${values.length + 1} AND owner_id=$${values.length + 2} RETURNING ${COLS}`,
      [...values, id.data, uid(req)],
    );
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json({ driver: rows[0] });
  } catch (e: any) {
    if (e.code === "23505") return res.status(409).json({ error: conflict(e.constraint) });
    throw e;
  }
});

// REGENERATE PIN
drivers.post("/:id/regenerate-pin", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Not found" });
  for (let i = 0; i < 5; i++) {
    try {
      const { rows } = await pool.query(
        `UPDATE drivers SET pin_code=$1, updated_at=now() WHERE id=$2 AND owner_id=$3 RETURNING ${COLS}`,
        [genPin(), id.data, uid(req)],
      );
      if (!rows[0]) return res.status(404).json({ error: "Not found" });
      return res.json({ driver: rows[0] });
    } catch (e: any) {
      if (e.code !== "23505") throw e;
    }
  }
  res.status(503).json({ error: "Could not generate a unique PIN. Try again." });
});

// DELETE
drivers.delete("/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: "Not found" });
  const { rowCount } = await pool.query("DELETE FROM drivers WHERE id=$1 AND owner_id=$2", [id.data, uid(req)]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});