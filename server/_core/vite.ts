import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
// Dynamic imports to avoid loading vite/esbuild/tailwind at module evaluation time
// import { createServer as createViteServer } from "vite";
// import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  // Guard: This should NEVER be called in production (e.g., on Vercel)
  if (process.env.NODE_ENV !== "development") {
    console.warn("[Vite] setupVite called in non-development mode, aborting");
    return;
  }

  console.log("[Vite] Setting up Vite dev server in development mode");
  
  // Dynamically import vite and config only when this function is called (development mode)
  // This prevents vite/tailwindcss/native modules from being loaded in production
  try {
    const viteModule = await import("vite");
    const configModule = await import("../../vite.config.js");
    
    const { createServer: createViteServer } = viteModule;
    const viteConfig = configModule.default;
    
    console.log("[Vite] Vite and config loaded successfully");

    const serverOptions = {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    };

    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      server: serverOptions,
      appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;

      try {
        const clientTemplate = path.resolve(
          import.meta.dirname,
          "../..",
          "client",
          "index.html"
        );

        // always reload the index.html file from disk incase it changes
        let template = await fs.promises.readFile(clientTemplate, "utf-8");
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } catch (err: any) {
    console.error("[Vite] Failed to set up Vite:", err?.message);
    throw err;
  }
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
