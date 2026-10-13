import { z } from "zod";
import { id, num, numOrNull, strOrNull } from "./common";

export const sessionSchema = z.object({
  id, driverId: id, driverName: z.string(), phone: z.string(), email: z.string(),
  plateNumber: z.string(), vehicleBrand: strOrNull, vehicleType: strOrNull,
  routeFrom: z.string(), routeTo: z.string(),
  startedAt: z.string(), endedAt: strOrNull,
  endReason: z.enum(["driver", "replaced", "timeout"]).nullish().transform((v) => v ?? null),
  deviceName: strOrNull, deviceBrand: strOrNull, deviceModel: strOrNull,
  osName: strOrNull, osVersion: strOrNull, appVersion: strOrNull, ipAddress: strOrNull,
  durationSec: num, points: num, distanceKm: num, maxSpeed: numOrNull, lastSeenAt: strOrNull,
});
export const summarySchema = z.object({ total: num, live: num, drivers: num, avgSec: num });
export const sessionsResponseSchema = z.object({
  sessions: z.array(sessionSchema), total: num, summary: summarySchema,
});