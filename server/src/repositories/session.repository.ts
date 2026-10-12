export function sessionFilter(userId: string, f: { q?: string; status: string; days: number }) {
  const where = ["d.owner_id = $1"];
  const params: unknown[] = [userId];
  if (f.q) {
    params.push(`%${f.q.replace(/[\\%_]/g, "\\$&")}%`);
    const n = `$${params.length}`;
    where.push(`(d.name ILIKE ${n} OR d.plate_number ILIKE ${n} OR d.phone ILIKE ${n} OR s.device_name ILIKE ${n}
      OR s.device_brand ILIKE ${n} OR s.device_model ILIKE ${n} OR s.ip_address ILIKE ${n})`);
  }
  if (f.status === "live") where.push("s.ended_at IS NULL");
  if (f.status === "ended") where.push("s.ended_at IS NOT NULL");
  if (f.days > 0) {
    params.push(f.days);
    where.push(`s.started_at > now() - make_interval(days => $${params.length}::int)`);
  }
  return { where: where.join(" AND "), params };
}

// Per-session stats come from the breadcrumb points recorded during the session (kept 30 days)
export const SESSION_SQL = `
  SELECT s.id, s.driver_id AS "driverId", d.name AS "driverName", d.phone, d.email,
         d.plate_number AS "plateNumber", d.vehicle_brand AS "vehicleBrand", d.vehicle_type AS "vehicleType",
         d.route_from AS "routeFrom", d.route_to AS "routeTo",
         s.started_at AS "startedAt", s.ended_at AS "endedAt", s.end_reason AS "endReason",
         s.device_name AS "deviceName", s.device_brand AS "deviceBrand", s.device_model AS "deviceModel",
         s.os_name AS "osName", s.os_version AS "osVersion", s.app_version AS "appVersion",
         s.ip_address AS "ipAddress",
         extract(epoch FROM (COALESCE(s.ended_at, now()) - s.started_at))::float8 AS "durationSec",
         st.points, st.distance_km AS "distanceKm", st.max_speed AS "maxSpeed",
         l.recorded_at AS "lastSeenAt"
    FROM tracking_sessions s
    JOIN drivers d ON d.id = s.driver_id
    LEFT JOIN driver_locations l ON l.driver_id = s.driver_id
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS points,
             max(speed)::float8 AS max_speed,
             COALESCE(sum(CASE WHEN plat IS NULL THEN 0 ELSE
               12742 * asin(least(1, sqrt(
                 power(sin(radians(lat - plat) / 2), 2) +
                 cos(radians(plat)) * cos(radians(lat)) * power(sin(radians(lng - plng) / 2), 2)
               ))) END), 0)::float8 AS distance_km
        FROM (
          SELECT p.lat, p.lng, p.speed,
                 lag(p.lat) OVER w AS plat, lag(p.lng) OVER w AS plng
            FROM location_points p
           WHERE p.driver_id = s.driver_id
             AND p.recorded_at >= s.started_at
             AND p.recorded_at <= COALESCE(s.ended_at, now())
          WINDOW w AS (ORDER BY p.recorded_at)
        ) x
    ) st ON true`;