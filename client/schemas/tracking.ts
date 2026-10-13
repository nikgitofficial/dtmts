import { z } from "zod";
import { id, num, numOrNull, strOrNull } from "./common";

export const liveDriverSchema = z.object({
  id, name: z.string(), phone: z.string(), plateNumber: z.string(),
  vehicleType: strOrNull, vehicleBrand: strOrNull,
  routeFrom: z.string(), routeTo: z.string(), capacityKg: num, status: z.enum(["active", "inactive"]),
  routeFromLat: numOrNull, routeFromLng: numOrNull, routeToLat: numOrNull, routeToLng: numOrNull,
  sharing: z.union([z.boolean(), z.number()]).transform(Boolean), sharingSince: strOrNull,
  lat: numOrNull, lng: numOrNull, accuracy: numOrNull, speed: numOrNull, heading: numOrNull,
  recordedAt: strOrNull, ageSec: numOrNull,
});
export const liveResponseSchema = z.object({ drivers: z.array(liveDriverSchema) });
export const trailPointSchema = z.object({ lat: num, lng: num, speed: numOrNull, recordedAt: z.string() });
export const trailResponseSchema = z.object({ points: z.array(trailPointSchema) });