import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import type { Response } from "express";
import { env, isProd } from "./env.js";

const ISS = "auth-starter", AUD = "auth-starter-web";
const ACCESS_TTL = 15 * 60, REFRESH_TTL = 7 * 24 * 3600;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const signAccess = (userId: string) =>
  jwt.sign({}, env.JWT_ACCESS_SECRET, { algorithm: "HS256", subject: userId, issuer: ISS, audience: AUD, expiresIn: ACCESS_TTL });

export const verifyAccess = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"], issuer: ISS, audience: AUD }) as jwt.JwtPayload;

export const signRefresh = (userId: string, familyId: string) =>
  jwt.sign({ fam: familyId }, env.JWT_REFRESH_SECRET, { algorithm: "HS256", subject: userId, issuer: ISS, audience: AUD, expiresIn: REFRESH_TTL, jwtid: randomUUID() });

export const verifyRefresh = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"], issuer: ISS, audience: AUD }) as jwt.JwtPayload & { fam: string };

const base = { httpOnly: true, secure: isProd, sameSite: "strict" as const };
export function setAuthCookies(res: Response, access: string, refresh: string) {
  // The cookie outlives the 15-min JWT inside it on purpose: the web middleware only
  // sees `at`, so an expired token must still reach the API, get a 401, and refresh.
  res.cookie("at", access, { ...base, path: "/", maxAge: REFRESH_TTL * 1000 });
  // Refresh cookie only travels to the refresh/logout endpoints
  res.cookie("rt", refresh, { ...base, path: "/api/auth", maxAge: REFRESH_TTL * 1000 });
}
export function clearAuthCookies(res: Response) {
  res.clearCookie("at", { ...base, path: "/" });
  res.clearCookie("rt", { ...base, path: "/api/auth" });
}
export const REFRESH_TTL_MS = REFRESH_TTL * 1000;
