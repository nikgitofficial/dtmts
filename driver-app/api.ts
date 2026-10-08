import * as SecureStore from "expo-secure-store";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.1.10:4000";
const KEY = "driver_token";

export type Driver = {
  id: string; name: string; email: string; phone: string;
  routeFrom: string; routeTo: string; plateNumber: string;
  vehicleType: string | null; capacityKg: number; status: "active" | "inactive";
};

export type LocationPoint = {
  lat: number; lng: number;
  accuracy: number | null; speed: number | null; heading: number | null;
  recordedAt: string; // ISO 8601
};

// NEW: device details sent when sharing starts
export type DeviceInfo = {
  name: string | null; brand: string | null; model: string | null;
  osName: string | null; osVersion: string | null; appVersion: string | null;
};

export const tokenStore = {
  get: () => SecureStore.getItemAsync(KEY),
  set: (t: string) => SecureStore.setItemAsync(KEY, t),
  clear: () => SecureStore.deleteItemAsync(KEY),
};

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function call<T>(path: string, method = "GET", body?: unknown, token?: string | null): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/driver${path}`, {
      method,
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest", // satisfies the server's csrfGuard
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection.", 0);
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Request failed", res.status);
  return data as T;
}

export const login = (identifier: string, pin: string) =>
  call<{ token: string; driver: Driver }>("/login", "POST", { identifier, pin });
export const me = (token: string) => call<{ driver: Driver }>("/me", "GET", undefined, token);

// NEW: optional device argument (old callers still work)
export const startTracking = (token: string, device?: DeviceInfo) =>
  call<{ ok: true }>("/tracking/start", "POST", device ? { device } : undefined, token);
export const stopTracking = (token: string) => call<{ ok: true }>("/tracking/stop", "POST", undefined, token);
export const pushLocations = (token: string, points: LocationPoint[]) =>
  call<{ ok: true; accepted: number }>("/location", "POST", { points }, token);