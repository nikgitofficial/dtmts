import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "./env.js";
import { verifyAccess } from "./tokens.js";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false,
  skip: (req) => req.path.startsWith("/api/tracking") || req.path === "/api/driver/location",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." },
});

// CSRF defense in depth (on top of SameSite=Strict cookies)
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (origin && origin !== env.CLIENT_ORIGIN) return res.status(403).json({ error: "Forbidden origin" });
  if (req.get("x-requested-with") !== "XMLHttpRequest") return res.status(403).json({ error: "Missing CSRF header" });
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.at as string | undefined;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    res.locals.userId = verifyAccess(token).sub;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
