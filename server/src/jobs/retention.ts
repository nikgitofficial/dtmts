import { pool } from "../config/db.js";

export function startRetentionJob(days = 30) {
  const run = () =>
    pool.query("DELETE FROM location_points WHERE recorded_at < now() - make_interval(days => $1::int)", [days])
      .catch((e) => console.error("retention", e));
  run();
  setInterval(run, 6 * 3600_000).unref();
}