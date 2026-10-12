import { Router } from "express";
import * as c from "../controllers/drivers.controller.js";
import { asyncHandler as h } from "../middleware/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";

export const driversRoutes = Router();
driversRoutes.use(requireAuth);
driversRoutes.get("/", h(c.list));
driversRoutes.get("/:id", h(c.get));
driversRoutes.post("/", h(c.create));
driversRoutes.patch("/:id", h(c.update));
driversRoutes.post("/:id/regenerate-pin", h(c.regeneratePin));
driversRoutes.delete("/:id", h(c.remove));