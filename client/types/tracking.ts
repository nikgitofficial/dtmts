import type { z } from "zod";
import type { liveDriverSchema, trailPointSchema } from "@/schemas/tracking";

export type LiveDriver = z.infer<typeof liveDriverSchema>;
export type TrailPoint = z.infer<typeof trailPointSchema>;
export type TrackState = "moving" | "idle" | "stale" | "offline";
/** A live driver plus its derived state, used by the list, dropdown and map. */
export type TrackRow = { d: LiveDriver; age: number | null; state: TrackState };