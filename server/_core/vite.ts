import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";

export async function setupVite(app: Express, server: Server) {
  // Guard: This should NEVER be called in production (e.g., on Vercel)
  if (process.env.NODE_ENV !== "development") {
    console.warn("[Vite] setupVite called in non-development mode, skipping vite setup");
    return;
  }

  try {
    // Only import vite/config if we're actually in development
    const viteModule = await import("vite");
    const { createServer: createViteServer, mergeConfig } = viteModule;
    
    // Load the main vite config
    const mainViteConfig = (await import("../../vite.config.ts")).default;
    
    // Create middleware-specific config
    const middlewareConfig = {
      server: {
        middlewareMode: true,
        hmr: { server },
      },
    };
    
    // Merge the main config with middleware overrides
    const viteConfig = mergeConfig(mainViteConfig, middlewareConfig, false);

    const vite = await createViteServer(viteConfig);
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
        const pageTemplate = await vite.transformIndexHtml(url, template);
        const ssrModule = await vite.ssrLoadModule('/src/entry-server.tsx');
        const render = ssrModule.render as ((requestUrl: string) => Promise<{ html: string; head: string }>) | undefined;

        if (typeof render !== 'function') {
          throw new Error('SSR render function not found in /src/entry-server.tsx');
        }

        const renderResult = await render(url);
        const appHtml = renderResult.html;
        const headHtml = renderResult.head || '';
        let page = pageTemplate.replace('<!--SSR_HEAD-->', headHtml);
        page = page.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } catch (err: any) {
    console.error("[Vite] Failed to set up Vite:", err?.message);
    // In dev, we want to see the error
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
