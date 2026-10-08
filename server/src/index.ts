import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./env.js";
import { auth } from "./auth.routes.js";
import { csrfGuard, globalLimiter } from "./middleware.js";
import { pool } from "./db.js";
import { drivers } from "./drivers.routes.js";
import { driverAuth } from "./driverAuth.routes.js";
import { tracking, driverTracking, startRetentionJob, startSessionSweeper } from "./tracking.routes.js"; // NEW: startSessionSweeper


const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Health check goes first so uptime monitors aren't rate limited or blocked by CORS/CSRF
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    console.error("health", e);
    res.status(503).json({ ok: false });
  }
});

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(globalLimiter);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use(csrfGuard);

app.use("/api/auth", auth);
app.use("/api/drivers", drivers);
app.use("/api/driver", driverAuth);
app.use("/api/tracking", tracking);
app.use("/api/driver", driverTracking);


app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

const server = app.listen(env.PORT, () => console.log(`API on :${env.PORT}`));
startRetentionJob(30); // purge breadcrumb history older than 30 days (runs now, then every 6h)
startSessionSweeper(); // NEW: close sessions after 30 min of silence (runs now, then every 5 min)

process.on("unhandledRejection", (reason) => console.error("unhandledRejection", reason));
// State may be corrupt after an uncaught exception: log, then exit and let the process manager restart us
process.on("uncaughtException", (err) => { console.error("uncaughtException", err); process.exit(1); });

const shutdown = () => {
  // Force exit if connections refuse to drain
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => { await pool.end(); process.exit(0); });
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);