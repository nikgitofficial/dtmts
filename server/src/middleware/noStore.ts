import type { NextFunction, Request, Response } from "express";

export function noStore(_req: Request, res: Response, next: NextFunction) {
  res.set("Cache-Control", "no-store");
  next();
}