import { pool } from "../config/db.js";

/* Close sessions whose driver went silent (phone died, app killed, no network) */
export function startSessionSweeper() {
  const run = () =>
    pool.query(
      `UPDATE tracking_sessions s
          SET ended_at = GREATEST(s.started_at, COALESCE(l.recorded_at, s.started_at)), end_reason = 'timeout'
         FROM drivers d LEFT JOIN driver_locations l ON l.driver_id = d.id
        WHERE d.id = s.driver_id AND s.ended_at IS NULL
          AND now() - GREATEST(s.started_at, COALESCE(l.recorded_at, s.started_at)) > interval '30 minutes'`,
    ).catch((e) => console.error("sweeper", e));
  run();
  setInterval(run, 5 * 60_000).unref();
}