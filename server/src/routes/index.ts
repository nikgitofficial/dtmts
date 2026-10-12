import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { driverAuthRoutes } from "./driverAuth.routes.js";
import { driversRoutes } from "./drivers.routes.js";
import { driverTrackingRoutes } from "./driverTracking.routes.js";
import { trackingRoutes } from "./tracking.routes.js";

export const apiRoutes = Router();
apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/drivers", driversRoutes);
apiRoutes.use("/driver", driverAuthRoutes);
apiRoutes.use("/tracking", trackingRoutes);
apiRoutes.use("/driver", driverTrackingRoutes);