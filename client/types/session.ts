import type { z } from "zod";
import type { sessionSchema, sessionsResponseSchema, summarySchema } from "@/schemas/session";

export type Session = z.infer<typeof sessionSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type SessionsResponse = z.infer<typeof sessionsResponseSchema>;
export type SessionState = "live" | "nosignal" | "completed" | "timeout" | "restarted";