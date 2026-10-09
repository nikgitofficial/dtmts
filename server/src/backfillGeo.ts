import { pool } from "./db.js";
import { geocode } from "./geocode.js";

const { rows } = await pool.query(
  "SELECT id, route_from, route_to FROM drivers WHERE route_from_lat IS NULL OR route_to_lat IS NULL",
);
for (const r of rows) {
  const [a, b] = await Promise.all([geocode(r.route_from), geocode(r.route_to)]);
  await pool.query(
    "UPDATE drivers SET route_from_lat=$2, route_from_lng=$3, route_to_lat=$4, route_to_lng=$5 WHERE id=$1",
    [r.id, a?.lat ?? null, a?.lng ?? null, b?.lat ?? null, b?.lng ?? null],
  );
}
console.log(`Backfilled ${rows.length} drivers`);
await pool.end();