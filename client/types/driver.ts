import type { z } from "zod";
import type { driverSchema } from "@/schemas/driver";

/** Single source of truth: derived from the runtime schema in schemas/driver.ts */
export type Driver = z.infer<typeof driverSchema>;