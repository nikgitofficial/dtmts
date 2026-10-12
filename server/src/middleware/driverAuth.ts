import type { NextFunction, Request, Response } from "express";
import { pool } from "../config/db.js";
import { DRIVER_PROFILE, pinVersion, safeEq, verifyDriverToken } from "../services/driverAuth.service.js";

export async function requireDriver(req: Request, res: Response, next: NextFunction) {
  const token = req.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const c = verifyDriverToken(token);
    const { rows } = await pool.query(`SELECT ${DRIVER_PROFILE}, pin_code FROM drivers WHERE id=$1`, [c.sub]);
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