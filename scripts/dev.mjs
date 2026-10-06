#!/usr/bin/env node
/**
 * `pnpm dev`: starts the API (tsx watch) and Vite together, on an API port
 * that is actually free.
 *
 * Vite proxies /api, /feed.xml, /payment/callback etc. to the API port. The
 * old script hard-coded 3001; when another program already listened there,
 * the API could not start but Vite carried on and forwarded every API call
 * to that other program (every request then failed with its 401s). Here the
 * port is chosen first and handed to both, and if either process stops the
 * other is stopped too, so a half-running dev server is never left behind.
 *
 * API_PORT pins the API port (it must be free); otherwise the first free
 * port from 3001 up is used. DEV_PORT moves the site itself off 3000.
 */
import net from "node:net";
import { spawn } from "node:child_process";

function isFree(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, () => server.close(() => resolve(true)));
  });
}

async function pickApiPort() {
  const pinned = process.env.API_PORT ? Number(process.env.API_PORT) : null;
  if (pinned) {
    if (await isFree(pinned)) return pinned;
    console.error(
      `[dev] API_PORT ${pinned} is already in use by another program. Choose another, or leave API_PORT unset to pick a free port automatically.`
    );
    process.exit(1);
  }
  for (let port = 3001; port < 3051; port++) {
    if (await isFree(port)) return port;
  }
  console.error("[dev] No free port for the API between 3001 and 3050.");
  process.exit(1);
}

// Vite serves the site on 3000 (vite.config.ts). Pin it there: if 3000 is
// busy, Vite would quietly move to the next free port, which can be the very
// port picked for the API below.
const VITE_PORT = Number(process.env.DEV_PORT) || 3000;
if (!(await isFree(VITE_PORT))) {
  console.error(
    `[dev] Port ${VITE_PORT} is already in use - probably another \`pnpm dev\` that is still running. Stop it (Ctrl+C in its terminal) and try again.`
  );
  process.exit(1);
}

const apiPort = await pickApiPort();
if (apiPort !== 3001) {
  console.log(
    `[dev] Port 3001 is taken by another program; the API is using port ${apiPort} and Vite's proxy follows it.`
  );
} else {
  console.log(`[dev] API on port ${apiPort}.`);
}

const env = { ...process.env, API_PORT: String(apiPort) };
const children = [
  spawn(
    "pnpm",
    [
      "exec",
      "vite",
      "--config",
      "vite.config.ts",
      "--port",
      String(VITE_PORT),
      "--strictPort",
    ],
    {
      stdio: "inherit",
      // Own process group, so stopping it also stops what pnpm started.
      detached: true,
      env,
    }
  ),
  spawn("pnpm", ["exec", "tsx", "watch", "server/_core/index.ts"], {
    stdio: "inherit",
    // Own process group, so stopping it also stops what pnpm started.
    detached: true,
    env: { ...env, PORT: String(apiPort), NODE_ENV: "development" },
  }),
];

let stopping = false;
function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    try {
      // Negative pid: the whole group (pnpm and the vite/tsx it runs).
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
  // Give them a moment to release their ports before this process exits.
  setTimeout(() => process.exit(code), 500);
}

for (const [index, child] of children.entries()) {
  child.on("exit", code => {
    if (stopping) return;
    console.error(
      `[dev] ${index === 0 ? "Vite" : "The API server"} stopped${code ? ` (exit code ${code})` : ""}; stopping the other one too.`
    );
    stopAll(code ?? 1);
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
