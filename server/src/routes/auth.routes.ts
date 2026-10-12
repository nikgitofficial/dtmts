import { Router } from "express";
import * as c from "../controllers/auth.controller.js";
import { asyncHandler as h } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";

export const authRoutes = Router();
authRoutes.post("/register", authLimiter, h(c.register));
authRoutes.post("/login", authLimiter, h(c.login));
authRoutes.post("/refresh", h(c.refresh));
authRoutes.post("/logout", h(c.logout));
authRoutes.get("/me", requireAuth, h(c.me));