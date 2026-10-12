import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { csrfGuard } from "./middleware/csrf.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { healthRoutes } from "./routes/health.routes.js";
import { apiRoutes } from "./routes/index.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Health check goes first so uptime monitors aren't rate limited or blocked by CORS/CSRF
  app.use(healthRoutes);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(globalLimiter);
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());
  app.use(csrfGuard);

  app.use("/api", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}