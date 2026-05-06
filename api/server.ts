import { createApp } from "../server/_core/app";
import express from "express";

let app: any = null;

try {
  app = createApp();
} catch (err: any) {
  console.error("[API] Failed to create app:", err && (err.stack || err.message || String(err)));
  // Fallback: return a minimal Express app that responds with JSON errors
  app = express();
  app.use(express.json());
  app.all("*", (_req, res) => {
    res.status(500).json({
      error: "Server initialization failed",
      details: err && (err.message || String(err)),
    });
  });
}

export default app;