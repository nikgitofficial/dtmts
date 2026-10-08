# Secure Auth Starter (Next.js 15 + Express + Neon Postgres)

Monorepo: `client/` (Next.js, Tailwind v4, TS) and `server/` (Express, TS, bcrypt, JWT, pg).

## Setup
1. Create a Neon project, copy the pooled connection string.
2. `cd server && cp .env.example .env` and fill values. Generate secrets: `openssl rand -base64 48` (two different ones).
3. `npm i && npm run db:init && npm run dev`   (API on :4000)
4. `cd client && cp .env.example .env.local && npm i && npm run dev`   (UI on :3000)

## Security design
- bcrypt cost 12, password max 72 bytes enforced, constant-time login (dummy hash for unknown emails)
- Access JWT (15m, HS256 pinned, issuer/audience checked) + rotating refresh token (7d)
- Tokens live in httpOnly, Secure, SameSite=Strict cookies (never in JS or localStorage)
- Refresh tokens stored only as SHA-256 hashes; reuse of a rotated token revokes the whole token family
- Next.js proxies `/api/*` to Express, so the browser only sees one origin (no CORS, SameSite=Strict works)
- CSRF: SameSite=Strict + Origin check + required `X-Requested-With` header on mutating requests
- helmet, strict CORS allowlist, rate limiting (global + login/register), zod validation, 10kb body limit
- Account lockout after repeated failures (15 min)
- Production: serve client and API over HTTPS, set `trust proxy`, rotate secrets periodically
