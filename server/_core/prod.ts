import express, { type Express } from "express";
import { createServer } from "http";
import net from "net";
import fs from "fs";
import path from "path";
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
  const distPath = path.resolve(import.meta.dirname, "../public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
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