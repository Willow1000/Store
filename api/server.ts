import express from "express";

let app: any = null;
let initError: any = null;

// Attempt to load the app with fallback
(async () => {
  try {
    // Primary: Try to import from TypeScript source (works in development)
    try {
      const { createApp } = await import("../server/_core/app");
      app = createApp();
      console.log("[API] App loaded from source");
    } catch (sourceErr: any) {
      // Source import failed (expected on Vercel where server/_core is not deployed)
      // Try bundled version instead
      console.log("[API] Source import failed, trying bundled version...");
      const bundled = await import("../dist/index.js");
      
      if (typeof bundled.createApp === 'function') {
        app = bundled.createApp();
        console.log("[API] App loaded from bundled dist/index.js");
      } else {
        throw new Error(`Bundled module missing createApp export: ${Object.keys(bundled)}`);
      }
    }
  } catch (err: any) {
    initError = err;
    console.error("[API] Failed to initialize app:", err?.message || String(err));
    console.error("[API] Stack:", err?.stack);
    
    // Create fallback app that returns JSON errors
    app = express();
    app.use(express.json());
    app.all("*", (_req, res) => {
      res.status(500).json({
        error: "Failed to initialize server",
        message: initError?.message || "Unknown error",
      });
    });
  }
})();

export default app;
