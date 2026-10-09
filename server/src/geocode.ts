const cache = new Map<string, { lat: number; lng: number } | null>();
let last = 0;

/** Place name -> coordinates (Nominatim, max 1 request/second, results cached). */
export async function geocode(place: string) {
  const key = place.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;

  const slot = Math.max(Date.now(), last + 1100); // serialise requests
  last = slot;
  await new Promise((r) => setTimeout(r, slot - Date.now()));

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.search = new URLSearchParams({ q: place, format: "jsonv2", limit: "1", countrycodes: "ph" }).toString();
    const r = await fetch(url, {
      // Nominatim requires an identifying User-Agent: put your real contact here
      headers: { "User-Agent": "jakkar-truck-tracker/1.0 (you@yourcompany.com)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const [hit] = (await r.json()) as { lat: string; lon: string }[];
    const out = hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
    cache.set(key, out);
    return out;
  } catch {
    return null; // network error: don't cache, don't block saving
  }
}