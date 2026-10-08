import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CLIENT_ORIGIN: z.string().url(),
});
export const env = schema.parse(process.env);
if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) throw new Error("JWT secrets must differ");
export const isProd = env.NODE_ENV === "production";
