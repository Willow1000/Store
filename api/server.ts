import express, { type Request, type Response, type NextFunction } from "express";

const handler = express();

handler.use(express.json({ limit: "50mb" }));
handler.use(express.urlencoded({ limit: "50mb", extended: true }));

// Middleware to load and delegate to the actual app
handler.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(`[API] ${req.method} ${req.path} - NODE_ENV=${process.env.NODE_ENV}`);
    
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
    console.log("[API] App created successfully");
    
    if (typeof app !== "function") {
      throw new Error(`createApp() returned ${typeof app}, expected function`);
    }
    
    console.log("[API] Delegating request to app...");
    return app(req, res, next);
  } catch (error: any) {
    console.error("[API] Error:", error?.message || String(error));
    if (error?.stack) {
      const stackLines = error.stack.split("\n").slice(1, 4).join("\n");
      console.error("[API] Stack trace (first 3 lines):\n", stackLines);
    }
    
    // Fallback for development: try loading from source
    if (process.env.NODE_ENV !== "production") {
      try {
        console.warn("[API] Trying source as fallback...");
        const source = await import("../server/_core/app");
        const { createApp } = source as any;
        const app = createApp();
        return app(req, res, next);
      } catch (sourceError: any) {
        console.error("[API] Source fallback also failed:", sourceError?.message);
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
