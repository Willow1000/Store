import express, { type Express } from "express";
import { createServer } from "http";
import net from "net";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { createApp } from "./app";

export { createApp };

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  const indexHtmlPath = path.resolve(distPath, "index.html");
  let template = "";
  try {
    template = fs.readFileSync(indexHtmlPath, "utf-8");
  } catch {
    template = "";
  }

  const ssrEntryPath = path.resolve(__dirname, "server", "entry-server.js");
  let render: ((url: string) => Promise<string>) | null = null;

  async function getRender() {
    if (render) return render;
    const mod = await import(pathToFileURL(ssrEntryPath).href);
    if (typeof mod?.render !== "function") {
      throw new Error("SSR render function not found in dist/server/entry-server.js");
    }
    render = mod.render;
    return render;
  }

  app.use("*", (_req, res) => {
    const req = _req;
    const acceptsHtml = (req.headers.accept || "").includes("text/html");
    if (!acceptsHtml || !template) {
      return res.sendFile(indexHtmlPath);
    }

    getRender()
      .then((ssrRender) => {
        if (!ssrRender) {
          throw new Error('SSR render function unavailable');
        }
        return ssrRender(req.originalUrl || req.url || "/");
      })
      .then((appHtml) => {
        const html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
        res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(html);
      })
      .catch(() => {
        res.sendFile(indexHtmlPath);
      });
  });
}

async function startServer() {
  const app = createApp();
  const server = createServer(app);
  serveStatic(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    // Intentionally left blank.
  }

  server.listen(port, () => {
    // Intentionally silent.
  });
}

if (process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}