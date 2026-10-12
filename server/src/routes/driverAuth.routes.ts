import { Router } from "express";
import * as c from "../controllers/driverAuth.controller.js";
import { asyncHandler as h } from "../middleware/asyncHandler.js";
import { requireDriver } from "../middleware/driverAuth.js";
import { authLimiter } from "../middleware/rateLimit.js";

export const driverAuthRoutes = Router();
driverAuthRoutes.post("/login", authLimiter, h(c.login));
driverAuthRoutes.get("/me", requireDriver, h(c.me));