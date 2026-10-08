import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { ApiError, pushLocations, startTracking, stopTracking, tokenStore, type LocationPoint } from "./api";

export const TASK_NAME = "truck-location-updates";
const QUEUE_KEY = "loc:queue";
const META_KEY = "loc:meta";
const MAX_QUEUE = 1000;        // ~80 min of fixes at one per 5s while offline
const BATCH = 40;              // must match the server limit
const MIN_GAP_MS = 4000;       // keep one fix per ~5s
const MAX_ACCURACY_M = 100;    // ignore very poor fixes

export type Meta = {
  lastSentAt: number | null;
  last: { lat: number; lng: number; accuracy: number | null; speed: number | null } | null;
  error: string | null;
};
export const EMPTY_META: Meta = { lastSentAt: null, last: null, error: null };

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

// Serialise queue access: the background task and the UI share the same storage
let chain: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

async function readQueue(): Promise<LocationPoint[]> {
  try { return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? "[]"); } catch { return []; }
}
const writeQueue = (q: LocationPoint[]) => AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));

export async function getMeta(): Promise<Meta> {
  try { return { ...EMPTY_META, ...JSON.parse((await AsyncStorage.getItem(META_KEY)) ?? "{}") }; } catch { return EMPTY_META; }
}
async function patchMeta(p: Partial<Meta>) {
  await AsyncStorage.setItem(META_KEY, JSON.stringify({ ...(await getMeta()), ...p }));
}
export const pendingCount = async () => (await readQueue()).length;

function toPoint(l: Location.LocationObject): LocationPoint | null {
  const { latitude, longitude, accuracy, speed, heading } = l.coords;
  if (accuracy != null && accuracy > MAX_ACCURACY_M) return null;
  return {
    lat: round(latitude, 6), lng: round(longitude, 6),
    accuracy: accuracy == null ? null : round(accuracy, 1),
    speed: speed == null || speed < 0 ? null : round(speed, 1),
    heading: heading == null || heading < 0 ? null : Math.min(360, Math.round(heading)),
    recordedAt: new Date(l.timestamp).toISOString(),
  };
}

function enqueue(points: LocationPoint[]) {
  if (!points.length) return Promise.resolve();
  return locked(async () => {
    const q = [...(await readQueue()), ...points].slice(-MAX_QUEUE);
    await writeQueue(q);
    const p = points[points.length - 1];
    await patchMeta({ last: { lat: p.lat, lng: p.lng, accuracy: p.accuracy, speed: p.speed } });
  });
}

/** Send queued fixes oldest-first. Failures keep the queue so nothing is lost while offline. */
export function flush(): Promise<void> {
  return locked(async () => {
    const token = await tokenStore.get();
    if (!token) return;
    for (;;) {
      const queue = await readQueue();
      if (!queue.length) return;
      const batch = queue.slice(0, BATCH);
      try {
        await pushLocations(token, batch);
        await writeQueue(queue.slice(batch.length));
        await patchMeta({ lastSentAt: Date.now(), error: null });
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          await writeQueue([]);
          await Location.stopLocationUpdatesAsync(TASK_NAME).catch(() => {});
          await patchMeta({ error: "Session ended. Please sign in again." });
          return;
        }
        if (e instanceof ApiError && e.status === 400) {
          await writeQueue(queue.slice(batch.length)); // poison batch: drop it and continue
          continue;
        }
        await patchMeta({ error: "No connection. Will retry automatically." });
        return;
      }
    }
  });
}

let lastKept = 0;
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK_NAME, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const pts: LocationPoint[] = [];
  for (const l of data.locations) {
    if (l.timestamp - lastKept < MIN_GAP_MS) continue;
    const p = toPoint(l);
    if (p) { pts.push(p); lastKept = l.timestamp; }
  }
  await enqueue(pts);
  await flush();
});

export const isSharing = () => Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false);

export type StartResult = "ok" | "denied" | "background-denied" | "services-off";

export async function startSharing(): Promise<StartResult> {
  if (!(await Location.hasServicesEnabledAsync())) return "services-off";
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return "denied";
  // A truck must keep reporting with the screen off, so "Allow all the time" is required
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") return "background-denied";

  const token = await tokenStore.get();
  if (!token) throw new ApiError("Please sign in again.", 401);
  await startTracking(token);

  if (!(await isSharing())) {
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,            // Android
      distanceInterval: 0,           // keep reporting while parked
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {           // Android: keeps tracking alive in background
        notificationTitle: "Sharing live location",
        notificationBody: "Your dispatcher can see your truck's position.",
        notificationColor: "#2563eb",
      },
    });
  }

  // Send a first fix right away so the dashboard shows the truck immediately
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const p = toPoint(pos);
    if (p) { lastKept = pos.timestamp; await enqueue([p]); }
    await flush();
  } catch { /* background updates will deliver the first fix */ }
  return "ok";
}

export async function stopSharing(): Promise<void> {
  if (await isSharing()) await Location.stopLocationUpdatesAsync(TASK_NAME);
  await flush();
  const token = await tokenStore.get();
  if (token) await stopTracking(token).catch(() => {});
  await locked(() => writeQueue([]));
}