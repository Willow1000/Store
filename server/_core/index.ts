import { createServer } from "http";
import net from "net";
import { serveStatic, setupVite } from "./vite";
import { createApp } from "./app";
import { logger } from "./logger";

// Export createApp for Vercel serverless functions
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

async function startServer() {
  const app = createApp();
  const server = createServer(app);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");

  // `pnpm dev` runs this API on an explicit PORT (3001) and Vite proxies
  // /api, /feed.xml, /payment/callback etc. to that exact port. Quietly moving
  // to the next free port left the proxy talking to whatever else held it -
  // another app then answered every API call (with the visitor's session
  // token attached). Refuse to start instead, and say how to fix it.
  if (process.env.PORT && !(await isPortAvailable(preferredPort))) {
    const message =
      `[Server] Port ${preferredPort} is already in use by another program. ` +
      `Close that program, or use \`pnpm dev\`, which picks a free port automatically.`;
    logger.error(message);
    console.error(message);
    process.exit(1);
  }

  const port = process.env.PORT
    ? preferredPort
    : await findAvailablePort(preferredPort);

  server.listen(port, () => {});
}

startServer().catch(err =>
  logger.error({ data: [err] }, "Failed to start server")
);
