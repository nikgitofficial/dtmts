import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false,
  skip: (req) => req.path.startsWith("/api/tracking") || req.path === "/api/driver/location",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." },
});

// Must run after requireDriver (needs res.locals.driver)
export const driverLimiter = rateLimit({
  windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (_req, res) => `d:${res.locals.driver.id}`,
  message: { error: "Too many location updates" },
});

// Must run after requireAuth (needs res.locals.userId)
export const adminTrackingLimiter = rateLimit({
  windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false,
  keyGenerator: (_req, res) => `u:${res.locals.userId}`,
});