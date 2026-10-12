import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../config/db.js";
import { DRIVER_PROFILE, parseIdentifier, safeEq, signDriver } from "../services/driverAuth.service.js";

const MAX_ATTEMPTS = 5;

const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  pin: z.string().regex(/^\d{6}$/),
});

const INVALID = { error: "Invalid email/phone or PIN" };

export async function login(req: Request, res: Response) {
  const p = loginSchema.safeParse(req.body);
  const id = p.success ? parseIdentifier(p.data.identifier) : null;
  if (!p.success || !id) return res.status(401).json(INVALID);
  const { pin } = p.data;

  // col comes from a fixed union in parseIdentifier, never from user input
  const { rows } = await pool.query(
    `SELECT ${DRIVER_PROFILE}, pin_code, locked_until FROM drivers WHERE ${id.col}=$1`,
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
}

export const me = (_req: Request, res: Response) => res.json({ driver: res.locals.driver });