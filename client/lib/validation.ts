import type { z } from "zod";

export type FieldErrors = Partial<Record<string, string>>;

/** Validate and return either typed data or a { field: message } map (first message per field). */
export function validate<S extends z.ZodTypeAny>(
  schema: S, data: unknown,
): { ok: true; data: z.infer<S> } | { ok: false; errors: FieldErrors } {
  const r = schema.safeParse(data);
  if (r.success) return { ok: true, data: r.data };
  const errors: FieldErrors = {};
  for (const i of r.error.issues) {
    const k = String(i.path[0] ?? "form");
    errors[k] ??= i.message;
  }
  return { ok: false, errors };
}