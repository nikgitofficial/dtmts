import pg from "pg";
import { env } from "./env.js";

// Local Postgres usually has no TLS; every remote host keeps strict verification
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(env.DATABASE_URL);

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: true },
  max: 10,
  idleTimeoutMillis: 30_000,
});