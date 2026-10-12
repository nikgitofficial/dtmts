import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

// CSRF defense in depth (on top of SameSite=Strict cookies)
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && origin !== env.CLIENT_ORIGIN) return res.status(403).json({ error: "Forbidden origin" });
  if (req.get("x-requested-with") !== "XMLHttpRequest") return res.status(403).json({ error: "Missing CSRF header" });
  next();
}