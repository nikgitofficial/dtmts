import type { NextFunction, Request, RequestHandler, Response } from "express";

// Forwards thrown/rejected errors from async handlers to the error middleware
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };