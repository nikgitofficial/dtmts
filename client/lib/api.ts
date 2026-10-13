import type { z } from "zod";
export type { User } from "@/types/user";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
export const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

async function raw(url: string, method: string, body?: unknown) {
  return fetch(url, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

let refreshing: Promise<boolean> | null = null;
const refresh = () => (refreshing ??= raw("/api/auth/refresh", "POST").then(async (r) => {
  if (r.status === 409) { await new Promise((x) => setTimeout(x, 400)); return true; } // another tab rotated; use its cookies
  return r.ok;
}).finally(() => (refreshing = null)));
const NO_REFRESH = ["/api/auth/login", "/api/auth/register", "/api/auth/refresh"];

async function call<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  let res = await raw(url, method, body);
  if (res.status === 401 && !NO_REFRESH.includes(url) && (await refresh())) res = await raw(url, method, body);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Request failed", res.status);
  return data as T;
}

export const api = <T>(path: string, method = "GET", body?: unknown) => call<T>(`/api/auth${path}`, method, body);
export const rest = <T>(path: string, method = "GET", body?: unknown) => call<T>(`/api${path}`, method, body);

/** Validate an API payload at the boundary; throws ApiError(502) if the shape is wrong. */
export function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) {
    console.error("[api] unexpected response shape", r.error.issues);
    throw new ApiError("Unexpected response from the server", 502);
  }
  return r.data;
}

/** `rest` + runtime validation of the response. */
export async function restParsed<S extends z.ZodTypeAny>(
  path: string, schema: S, method = "GET", body?: unknown,
): Promise<z.infer<S>> {
  return parse(schema, await rest<unknown>(path, method, body));
}