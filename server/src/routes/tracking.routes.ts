import { Router } from "express";
import * as c from "../controllers/tracking.controller.js";
import { asyncHandler as h } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { noStore } from "../middleware/noStore.js";
import { adminTrackingLimiter } from "../middleware/rateLimit.js";

export const trackingRoutes = Router();
trackingRoutes.use(requireAuth, adminTrackingLimiter, noStore);
trackingRoutes.get("/live", h(c.live));
trackingRoutes.get("/sessions", h(c.sessions));
trackingRoutes.get("/sessions/export", h(c.exportSessions));
trackingRoutes.get("/:id/history", h(c.history));