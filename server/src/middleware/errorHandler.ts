import type { NextFunction, Request, Response } from "express";

export const notFound = (_req: Request, res: Response) => res.status(404).json({ error: "Not found" });

export function errorHandler(err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON" });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Request too large" });
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}