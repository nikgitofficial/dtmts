import { z } from "zod";

// APIs backed by SQL often return numeric columns as strings; coerce defensively.
export const num = z.coerce.number();
export const numOrNull = z.preprocess((v) => (v == null ? null : Number(v)), z.number().nullable());
export const strOrNull = z.string().nullish().transform((v) => v ?? null);
export const id = z.coerce.string();