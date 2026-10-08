import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool } from "./db.js";
import { authLimiter, requireAuth } from "./middleware.js";
import {
  REFRESH_TTL_MS, clearAuthCookies, setAuthCookies, sha256,
  signAccess, signRefresh, verifyRefresh,
} from "./tokens.js";

export const auth = Router();
const COST = 12;
const MAX_ATTEMPTS = 5, LOCK_MS = 15 * 60_000;
// Used to equalize timing when the email does not exist
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", COST);

const password = z.string().min(10, "Use at least 10 characters").refine((p) => Buffer.byteLength(p) <= 72, "Password too long (max 72 bytes)");
const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password,
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

async function issueSession(res: Response, userId: string, familyId: string = randomUUID()) {
  const refresh = signRefresh(userId, familyId);
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at) VALUES ($1,$2,$3,$4)",
    [userId, familyId, sha256(refresh), new Date(Date.now() + REFRESH_TTL_MS)],
  );
  setAuthCookies(res, signAccess(userId), refresh);
}

auth.post("/register", authLimiter, async (req: Request, res: Response) => {
  const p = registerSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message ?? "Invalid input" });
  const { name, email, password } = p.data;
  const hash = await bcrypt.hash(password, COST);
  try {
    const { rows } = await pool.query("INSERT INTO users (email,name,password_hash) VALUES ($1,$2,$3) RETURNING id,email,name", [email, name, hash]);
    await issueSession(res, rows[0].id);
    res.status(201).json({ user: rows[0] });
  } catch (e: any) {
    if (e.code === "23505") return res.status(409).json({ error: "Unable to create account with those details" });
    throw e;
  }
});

auth.post("/login", authLimiter, async (req: Request, res: Response) => {
  const p = loginSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Invalid email or password" });
  const { email, password } = p.data;
  const { rows } = await pool.query("SELECT id,email,name,password_hash,failed_attempts,locked_until FROM users WHERE email=$1", [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

  if (user?.locked_until && new Date(user.locked_until) > new Date())
    return res.status(429).json({ error: "Account temporarily locked. Try again later." });

  if (!user || !ok) {
    if (user) {
      const attempts = user.failed_attempts + 1;
      await pool.query("UPDATE users SET failed_attempts=$2, locked_until=$3 WHERE id=$1",
        [user.id, attempts >= MAX_ATTEMPTS ? 0 : attempts, attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MS) : null]);
    }
    return res.status(401).json({ error: "Invalid email or password" });
  }
  await pool.query("UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=$1", [user.id]);
  await issueSession(res, user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

// Rotate refresh token; reuse of an old token revokes the entire family
auth.post("/refresh", async (req: Request, res: Response) => {
  const token = req.cookies?.rt as string | undefined;
  if (!token) {
    clearAuthCookies(res); // drop a lingering `at` so the middleware can't loop /login <-> /dashboard
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const claims = verifyRefresh(token);
    const { rows } = await pool.query(
      `SELECT id, revoked_at, (revoked_at > now() - interval '10 seconds') AS recent
         FROM refresh_tokens WHERE token_hash=$1`,
      [sha256(token)],
    );
    const row = rows[0];
    if (!row) throw new Error("unknown");
    if (row.revoked_at) {
      // Just rotated by a parallel request (e.g. a second tab): not theft, and don't clear cookies
      if (row.recent) return res.status(409).json({ error: "Refresh in progress" });
      await pool.query("UPDATE refresh_tokens SET revoked_at=now() WHERE family_id=$1 AND revoked_at IS NULL", [claims.fam]);
      throw new Error("reuse");
    }
    // Atomic claim: only one concurrent request can flip revoked_at from NULL
    const claimed = await pool.query(
      "UPDATE refresh_tokens SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL RETURNING id",
      [row.id],
    );
    if (!claimed.rowCount) return res.status(409).json({ error: "Refresh in progress" });
    await issueSession(res, claims.sub!, claims.fam);
    res.json({ ok: true });
  } catch {
    clearAuthCookies(res);
    res.status(401).json({ error: "Session expired" });
  }
});

auth.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.rt as string | undefined;
  if (token) await pool.query("UPDATE refresh_tokens SET revoked_at=now() WHERE token_hash=$1", [sha256(token)]);
  clearAuthCookies(res);
  res.json({ ok: true });
});

auth.get("/me", requireAuth, async (_req, res) => {
  const { rows } = await pool.query("SELECT id,email,name,created_at FROM users WHERE id=$1", [res.locals.userId]);
  if (!rows[0]) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user: rows[0] });
});
