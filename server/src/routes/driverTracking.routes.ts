import { Router } from "express";
import * as c from "../controllers/driverTracking.controller.js";
import { asyncHandler as h } from "../middleware/asyncHandler.js";
import { requireDriver } from "../middleware/driverAuth.js";
import { driverLimiter } from "../middleware/rateLimit.js";

export const driverTrackingRoutes = Router();
driverTrackingRoutes.post("/tracking/start", requireDriver, h(c.start));
driverTrackingRoutes.post("/tracking/stop", requireDriver, h(c.stop));
driverTrackingRoutes.post("/location", requireDriver, driverLimiter, h(c.location));