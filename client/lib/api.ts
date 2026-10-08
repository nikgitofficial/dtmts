export type User = { id: string; email: string; name: string; created_at?: string };

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
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

export const api = <T>(path: string, method = "GET", body?: unknown) => call<T>(`/api/auth${path}`, method, body);
export const rest = <T>(path: string, method = "GET", body?: unknown) => call<T>(`/api${path}`, method, body);