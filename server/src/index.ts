import { createApp } from "./app.js";
import { pool } from "./config/db.js";
import { env } from "./config/env.js";
import { startRetentionJob } from "./jobs/retention.js";
import { startSessionSweeper } from "./jobs/sessionSweeper.js";

const server = createApp().listen(env.PORT, () => console.log(`API on :${env.PORT}`));
startRetentionJob(30); // purge breadcrumb history older than 30 days (runs now, then every 6h)
startSessionSweeper(); // close sessions after 30 min of silence (runs now, then every 5 min)

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