import express, { type Express, type Request, type Response, type NextFunction } from "express";

const handler = express();

handler.use(express.json({ limit: "50mb" }));
handler.use(express.urlencoded({ limit: "50mb", extended: true }));

// Middleware to load and delegate to the actual app
handler.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to load the bundled createApp function
    // The dist/index.js gets bundled and included in the function package via vercel.json
    console.log("[API] Loading bundled module from dist/index.js...");
    
    const bundled = await import("../dist/index.js");
    console.log("[API] Bundled module loaded, exports:", Object.keys(bundled || {}));
    
    const { createApp } = bundled as any;

    if (typeof createApp !== "function") {
      const exported = Object.keys(bundled || {});
      console.error("[API] createApp is not a function, got:", typeof createApp, "exports:", exported);
      throw new Error(
        `Invalid createApp ${
          exported.length > 0 ? `(available: ${exported.join(", ")})` : "(module has no exports)"
        }`
      );
    }

    console.log("[API] Calling createApp()...");
    // Create the actual app and delegate the request
    const app = createApp();
    console.log("[API] App created, type:", typeof app, "is function:", typeof app === "function");
    
    if (typeof app !== "function") {
      throw new Error(`createApp() returned ${typeof app}, expected function`);
    }
    
    console.log("[API] Delegating request to app...");
    return app(req, res, next);
  } catch (error: any) {
    console.error("[API] Error in middleware:", error?.message || String(error));
    console.error("[API] Error details:", error);
    
    // Fallback for development: try loading from source
    if (process.env.NODE_ENV !== "production") {
      try {
        console.warn("[API] Bundled import failed, trying source...");
        const source = await import("../server/_core/app");
        const { createApp } = source as any;
        const app = createApp();
        return app(req, res, next);
      } catch (sourceError: any) {
        console.error("[API] Source import also failed:", sourceError?.message);
      }
    }

    // Error: couldn't load server
    return res.status(500).json({
      error: "Failed to initialize server",
      message: error?.message || "Unknown error",
      ...(process.env.NODE_ENV !== "production" && { 
        stack: error?.stack?.split("\n").slice(0, 3).join("\n")
      }),
    });
  }
});

export default handler;
