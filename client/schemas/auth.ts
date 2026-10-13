import { z } from "zod";
import { id } from "./common";

export const userSchema = z.object({ id, email: z.string(), name: z.string(), created_at: z.string().optional() });
export const meResponseSchema = z.object({ user: userSchema });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1, "Enter your name").max(80, "Name is too long (max 80)"),
  password: z.string().min(10, "Use at least 10 characters for your password"),
});