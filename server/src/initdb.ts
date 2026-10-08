import { readFileSync } from "node:fs";
import { pool } from "./db.js";

await pool.query(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
console.log("Database ready");
await pool.end();
