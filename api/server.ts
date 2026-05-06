import express from "express";

let app: any = null;
let initError: any = null;

// Try to load createApp from the bundled server
try {
  // Dynamic import of the bundled server module
  // This will work on Vercel where dist/index.js exists
  // On local dev, it may fail if dist isn't built yet
  const bundled = await import("../dist/index.js");
  
  if (typeof bundled?.createApp === "function") {
    app = bundled.createApp();
    console.log("[API] ✓ Loaded createApp from dist/index.js (bundle)");
  } else {
    throw new Error(`Bundle exports: ${Object.keys(bundled || {}).join(", ")}`);
  }
} catch (bundleErr: any) {
  // Fallback for local development
  console.warn("[API] Bundle import failed, trying source...");
  try {
    const source = await import("../server/_core/app.ts");
    const createApp = source.createApp || source.default;
    if (typeof createApp === "function") {
      app = createApp();
      console.log("[API] ✓ Loaded from source (development mode)");
    } else {
      throw new Error("No createApp export in source");
    }
  } catch (sourceErr: any) {
    initError = sourceErr;
    console.error("[API] ✗ Failed to load app");
    console.error("[API]   Bundle error:", bundleErr?.message);
    console.error("[API]   Source error:", sourceErr?.message);
  }
}

// If initialization failed, use error handler
if (!app) {
  console.error("[API] Creating fallback error handler");
  app = express();
  app.use(express.json());
  
  app.all("*", (_req: any, res: any) => {
    console.error(`[API] Handler error: ${_req.method} ${_req.url}`);
    res.status(500).json({
      error: "Server initialization failed",
      message: initError?.message || "Unknown error",
    });
  });
}

export default app;
