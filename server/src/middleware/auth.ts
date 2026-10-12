import type { NextFunction, Request, Response } from "express";
import { verifyAccess } from "../services/token.service.js";

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