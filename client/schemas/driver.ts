import { z } from "zod";
import type { Driver } from "@/types/driver";
import { id, num, numOrNull, strOrNull } from "./common";

/* ── API response ── */
export const driverSchema = z.object({
  id, name: z.string(), email: z.string(), phone: z.string(),
  routeFrom: z.string(), routeTo: z.string(),
  routeFromLat: numOrNull, routeFromLng: numOrNull, routeToLat: numOrNull, routeToLng: numOrNull,
  pinCode: z.coerce.string(), plateNumber: z.string(),
  vehicleBrand: strOrNull, vehicleType: strOrNull,
  capacityKg: num, status: z.enum(["active", "inactive"]),
  createdAt: z.string(), updatedAt: z.string(),
});
export const driversResponseSchema = z.object({ drivers: z.array(driverSchema), total: num });
export const driverResponseSchema = z.object({ driver: driverSchema });

/* ── Text formatting ── */
const MINOR_WORDS = new Set(["de", "del", "of", "the", "and"]);
const capWord = (w: string) => w.replace(/(^|[-.])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

/**
 * "johm m paceno" → "Johm M Paceno". With keepMinor, connectors stay lowercase
 * ("cagayan de oro" → "Cagayan de Oro"). Also trims and collapses spaces.
 */
export function titleCase(s: string | null | undefined, keepMinor = false): string {
  if (!s) return "";
  return s
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((w, i) => (keepMinor && i > 0 && MINOR_WORDS.has(w) ? w : capWord(w)))
    .join(" ");
}
/** Display helper for places (routes) */
export const place = (s: string | null | undefined) => titleCase(s, true);

/* ── Form ── */
export const PHONE_RE = /^(\+?63|0)9\d{9}$/;
export const PLATE_RE = /^[A-Z0-9 -]{5,10}$/;
/** A delivery truck/van below this is almost certainly a typo (e.g. 4 kg). */
export const MIN_CAPACITY_KG = 100;
export const MAX_CAPACITY_KG = 100000;
export const cleanPhone = (s: string) => s.replace(/[\s-]/g, "");
export const normPhone = (s: string) => {
  const d = cleanPhone(s.trim());
  return PHONE_RE.test(d) ? "+63" + d.replace(/^(\+?63|0)/, "") : d;
};
export const normPlate = (s: string) => s.trim().toUpperCase().replace(/\s+/g, " ");

export const driverFormSchema = z.object({
  name: z.string().trim().min(1, "Enter the driver's name").max(80, "Name is too long (max 80)"),
  email: z.string().trim().email("Enter a valid email address").max(254, "Email is too long"),
  phone: z.string().refine((v) => PHONE_RE.test(cleanPhone(v)), "Enter a valid PH mobile number, e.g. 0917 123 4567"),
  routeFrom: z.string().trim().min(1, "Enter the origin").max(80, "Too long (max 80)"),
  routeTo: z.string().trim().min(1, "Enter the destination").max(80, "Too long (max 80)"),
  plateNumber: z.string().refine((v) => PLATE_RE.test(normPlate(v)), "Use 5–10 letters, numbers, spaces or dashes"),
  vehicleBrand: z.string().trim().max(40, "Too long (max 40)"),
  vehicleType: z.string().trim().max(40, "Too long (max 40)"),
  capacityKg: z.string().refine(
    (v) => v.trim() !== "" && Number(v) >= MIN_CAPACITY_KG && Number(v) <= MAX_CAPACITY_KG,
    `Enter a capacity between ${MIN_CAPACITY_KG.toLocaleString()} and ${MAX_CAPACITY_KG.toLocaleString()} kg`,
  ),
  status: z.enum(["active", "inactive"]),
});
export type DriverFormValues = z.infer<typeof driverFormSchema>;
export type DriverKey = keyof DriverFormValues;

export type CanonDriver = Omit<DriverFormValues, "vehicleBrand" | "vehicleType" | "capacityKg"> &
  { vehicleBrand: string | null; vehicleType: string | null; capacityKg: number };

export const DRIVER_LABELS: Record<DriverKey, string> = {
  name: "Name", email: "Email", phone: "Phone", routeFrom: "Origin", routeTo: "Destination",
  plateNumber: "Plate number", vehicleBrand: "Truck brand", vehicleType: "Vehicle type",
  capacityKg: "Capacity", status: "Status",
};
export const DRIVER_KEYS = Object.keys(DRIVER_LABELS) as DriverKey[];

/** Per-field cleanup applied on blur and again in canon() before saving. */
export const FIELD_FORMAT: Partial<Record<DriverKey, (s: string) => string>> = {
  name: (s) => titleCase(s),
  routeFrom: (s) => titleCase(s, true),
  routeTo: (s) => titleCase(s, true),
  vehicleBrand: (s) => titleCase(s),
  vehicleType: (s) => titleCase(s),
};

export function toForm(d?: Driver | null): DriverFormValues {
  return {
    name: d?.name ?? "", email: d?.email ?? "", phone: d?.phone ?? "",
    routeFrom: d?.routeFrom ?? "", routeTo: d?.routeTo ?? "",
    plateNumber: d?.plateNumber ?? "", vehicleBrand: d?.vehicleBrand ?? "", vehicleType: d?.vehicleType ?? "",
    capacityKg: d ? String(d.capacityKg) : "", status: d?.status ?? "active",
  };
}

/** Same normalisation the server should apply, so "no change" really means no change. */
export function canon(f: DriverFormValues): CanonDriver {
  return {
    name: titleCase(f.name), email: f.email.trim().toLowerCase(), phone: normPhone(f.phone),
    routeFrom: titleCase(f.routeFrom, true), routeTo: titleCase(f.routeTo, true), plateNumber: normPlate(f.plateNumber),
    vehicleBrand: titleCase(f.vehicleBrand) || null, vehicleType: titleCase(f.vehicleType) || null,
    capacityKg: Number(f.capacityKg), status: f.status,
  };
}