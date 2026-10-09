import { Router, type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { pool } from "./db.js";
import { env } from "./env.js";
import { authLimiter } from "./middleware.js";

export const driverAuth = Router();

const ISS = "auth-starter", AUD = "auth-starter-driver";
const TOKEN_TTL = 30 * 24 * 3600;
const MAX_ATTEMPTS = 5;

const PROFILE = `id, name, email, phone, route_from AS "routeFrom", route_to AS "routeTo",
  plate_number AS "plateNumber", vehicle_brand AS "vehicleBrand", vehicle_type AS "vehicleType",
  capacity_kg::float8 AS "capacityKg", status`;

// Binds the token to the current PIN: regenerating the PIN invalidates old sessions.
// HMAC (not a plain hash) so the claim can't be used to brute-force the PIN offline.
const pinVersion = (id: string, pin: string) =>
  createHmac("sha256", env.JWT_ACCESS_SECRET).update(`${id}:${pin}`).digest("hex").slice(0, 16);

const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const signDriver = (id: string, pin: string) =>
  jwt.sign({ pv: pinVersion(id, pin) }, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256", subject: id, issuer: ISS, audience: AUD, expiresIn: TOKEN_TTL,
  });

// "a@b.com" -> email lookup; otherwise PH mobile -> +639XXXXXXXXX
function parseIdentifier(raw: string): { col: "email" | "phone"; value: string } | null {
  const s = raw.trim();
  if (s.includes("@")) {
    const e = z.string().email().max(254).safeParse(s.toLowerCase());
    return e.success ? { col: "email", value: e.data } : null;
  }
  const digits = s.replace(/[\s-]/g, "");
  if (!/^(\+?63|0)9\d{9}$/.test(digits)) return null;
  return { col: "phone", value: "+63" + digits.replace(/^(\+?63|0)/, "") };
}

const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  pin: z.string().regex(/^\d{6}$/),
});

const INVALID = { error: "Invalid email/phone or PIN" };

driverAuth.post("/login", authLimiter, async (req, res) => {
  const p = loginSchema.safeParse(req.body);
  const id = p.success ? parseIdentifier(p.data.identifier) : null;
  if (!p.success || !id) return res.status(401).json(INVALID);
  const { pin } = p.data;

  // col comes from a fixed union above, never from user input
  const { rows } = await pool.query(
    `SELECT ${PROFILE}, pin_code, locked_until FROM drivers WHERE ${id.col}=$1`,
    [id.value],
  );
  const now = new Date();
  const open = rows.filter((r) => !r.locked_until || new Date(r.locked_until) <= now);
  if (rows.length && !open.length)
    return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });

  // The same email/phone can exist under different owners, so match on the PIN too
  const match = open.find((r) => safeEq(String(r.pin_code), pin));
  if (!match) {
    if (open.length) {
      await pool.query(
        `UPDATE drivers SET
           failed_attempts = CASE WHEN failed_attempts + 1 >= $2 THEN 0 ELSE failed_attempts + 1 END,
           locked_until = CASE WHEN failed_attempts + 1 >= $2 THEN now() + interval '15 minutes' ELSE locked_until END
         WHERE id = ANY($1::uuid[])`,
        [open.map((r) => r.id), MAX_ATTEMPTS],
      );
    }
    return res.status(401).json(INVALID);
  }
  if (match.status !== "active")
    return res.status(403).json({ error: "This account is inactive. Contact your dispatcher." });

  await pool.query("UPDATE drivers SET failed_attempts=0, locked_until=NULL WHERE id=$1", [match.id]);
  const { pin_code: _p, locked_until: _l, ...driver } = match;
  res.json({ token: signDriver(match.id, pin), driver });
});

export async function requireDriver(req: Request, res: Response, next: NextFunction) {
  const token = req.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const c = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"], issuer: ISS, audience: AUD }) as jwt.JwtPayload & { pv: string };
    const { rows } = await pool.query(`SELECT ${PROFILE}, pin_code FROM drivers WHERE id=$1`, [c.sub]);
    const d = rows[0];
    if (!d || d.status !== "active" || !safeEq(pinVersion(d.id, String(d.pin_code)), c.pv))
      return res.status(401).json({ error: "Unauthorized" });
    const { pin_code: _p, ...driver } = d;
    res.locals.driver = driver;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

driverAuth.get("/me", requireDriver, (_req, res) => res.json({ driver: res.locals.driver }));