import express, { type Express, type Request, type Response, type NextFunction } from "express";

const handler = express();

handler.use(express.json({ limit: "50mb" }));
handler.use(express.urlencoded({ limit: "50mb", extended: true }));

// Middleware to load and delegate to the actual app
handler.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Try to load the bundled createApp function
    // The dist/index.js gets bundled and included in the function package via vercel.json
    const bundled = await import("../dist/index.js");
    const { createApp } = bundled as any;

    if (typeof createApp !== "function") {
      console.error(
        "[API] Bundled module missing createApp:",
        Object.keys(bundled || {})
      );
      throw new Error(
        `Invalid bundled module${
          bundled ? `: ${Object.keys(bundled).join(", ")}` : ""
        }`
      );
    }

    // Create the actual app and delegate the request
    const app = createApp();
    return app(req, res, next);
  } catch (error: any) {
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
    console.error("[API] Failed to initialize server:", error?.message);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to initialize server module",
      ...(process.env.NODE_ENV === "development" && { details: error?.message }),
    });
  }
});

export default handler;
