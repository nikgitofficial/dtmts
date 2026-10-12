import jwt from "jsonwebtoken";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";

const ISS = "auth-starter", AUD = "auth-starter-driver";
const TOKEN_TTL = 30 * 24 * 3600;

export const DRIVER_PROFILE = `id, name, email, phone, route_from AS "routeFrom", route_to AS "routeTo",
  plate_number AS "plateNumber", vehicle_brand AS "vehicleBrand", vehicle_type AS "vehicleType",
  capacity_kg::float8 AS "capacityKg", status`;

// Binds the token to the current PIN: regenerating the PIN invalidates old sessions.
// HMAC (not a plain hash) so the claim can't be used to brute-force the PIN offline.
export const pinVersion = (id: string, pin: string) =>
  createHmac("sha256", env.JWT_ACCESS_SECRET).update(`${id}:${pin}`).digest("hex").slice(0, 16);

export const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const signDriver = (id: string, pin: string) =>
  jwt.sign({ pv: pinVersion(id, pin) }, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256", subject: id, issuer: ISS, audience: AUD, expiresIn: TOKEN_TTL,
  });

export const verifyDriverToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"], issuer: ISS, audience: AUD }) as jwt.JwtPayload & { pv: string };

// "a@b.com" -> email lookup; otherwise PH mobile -> +639XXXXXXXXX
export function parseIdentifier(raw: string): { col: "email" | "phone"; value: string } | null {
  const s = raw.trim();
  if (s.includes("@")) {
    const e = z.string().email().max(254).safeParse(s.toLowerCase());
    return e.success ? { col: "email", value: e.data } : null;
  }
  const digits = s.replace(/[\s-]/g, "");
  if (!/^(\+?63|0)9\d{9}$/.test(digits)) return null;
  return { col: "phone", value: "+63" + digits.replace(/^(\+?63|0)/, "") };
}