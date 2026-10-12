import { Router } from "express";
import { pool } from "../config/db.js";

export const healthRoutes = Router();
healthRoutes.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    console.error("health", e);
    res.status(503).json({ ok: false });
  }
});