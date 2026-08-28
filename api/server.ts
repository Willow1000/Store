import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import pino from "pino";

// This file is Vercel's serverless function entry point, deployed as a
// standalone bundle (see vercel.json's `includeFiles`) - it can't rely on a
// relative import into server/_core/logger.ts, since only this file plus
// dist/** actually ship with the function. The logger is duplicated here
// (matching server/_core/logger.ts's config) rather than imported.
const logger = pino({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: false,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
});

const handler = express();
const require = createRequire(import.meta.url);

const PUBLIC_DIST_DIR = path.resolve(process.cwd(), "dist", "public");
const SSR_ENTRY_PATH = path.resolve(
  process.cwd(),
  "dist",
  "server",
  "entry-server.js"
);

const SERVER_ROUTE_PREFIXES = [
  "/api",
  "/payment/callback",
  "/initialize-payment",
  "/feed.xml",
  "/robots.txt",
  "/llms.txt",
  "/sitemap.xml",
  "/sitemap-products.xml",
  "/.well-known/apple-developer-merchantid-domain-association",
];

type SsrRenderResult = { html: string; head: string };

let cachedIndexTemplate: string | null = null;
let cachedRender: ((url: string) => Promise<SsrRenderResult>) | null = null;

function isStaticAssetPath(urlPath: string): boolean {
  return (
    /\.[a-z0-9]+$/i.test(urlPath) ||
    urlPath.startsWith("/assets/") ||
    urlPath.startsWith("/images/")
  );
}

function shouldDelegateToServer(urlPath: string): boolean {
  return SERVER_ROUTE_PREFIXES.some(
    prefix => urlPath === prefix || urlPath.startsWith(`${prefix}/`)
  );
}

function getSafeAssetPath(urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath);
  const normalized = path.normalize(decoded).replace(/^\.\.(\/|\\|$)/, "");
  const candidate = path.resolve(
    PUBLIC_DIST_DIR,
    `.${normalized.startsWith("/") ? normalized : `/${normalized}`}`
  );
  if (!candidate.startsWith(PUBLIC_DIST_DIR)) return null;
  return candidate;
}

function getIndexTemplate(): string | null {
  if (cachedIndexTemplate !== null) return cachedIndexTemplate;
  const indexPath = path.resolve(PUBLIC_DIST_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    cachedIndexTemplate = null;
    return null;
  }
  cachedIndexTemplate = fs.readFileSync(indexPath, "utf-8");
  return cachedIndexTemplate;
}

async function getSsrRender(): Promise<
  ((url: string) => Promise<SsrRenderResult>) | null
> {
  if (cachedRender) return cachedRender;
  if (!fs.existsSync(SSR_ENTRY_PATH)) return null;

  const mod = await import(pathToFileURL(SSR_ENTRY_PATH).href);
  if (typeof mod?.render !== "function") return null;
  cachedRender = mod.render;
  return cachedRender;
}

handler.use(express.json({ limit: "50mb" }));
handler.use(express.urlencoded({ limit: "50mb", extended: true }));

// Middleware to load and delegate to the actual app
handler.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.NODE_ENV === "production") {
      const requestPath = req.path || "/";

      if (isStaticAssetPath(requestPath)) {
        const filePath = getSafeAssetPath(requestPath);
        if (
          filePath &&
          fs.existsSync(filePath) &&
          fs.statSync(filePath).isFile()
        ) {
          return res.sendFile(filePath);
        }
      }

      const isHtmlRequest =
        req.method === "GET" &&
        (req.headers.accept || "").includes("text/html");

      if (!shouldDelegateToServer(requestPath) && isHtmlRequest) {
        const template = getIndexTemplate();
        const ssrRender = await getSsrRender();
        if (template && ssrRender) {
          try {
            const { html: appHtml, head: headHtml } = await ssrRender(
              req.originalUrl || req.url || "/"
            );
            const html = template
              .replace("<!--SSR_HEAD-->", headHtml || "")
              .replace(
                '<div id="root"></div>',
                `<div id="root">${appHtml || ""}</div>`
              );
            return res
              .status(200)
              .set({ "Content-Type": "text/html; charset=utf-8" })
              .send(html);
          } catch (ssrError: any) {
            logger.error(
              { data: [ssrError?.message || String(ssrError)] },
              "[API] SSR render failed, serving static shell"
            );
            return res
              .status(200)
              .set({ "Content-Type": "text/html; charset=utf-8" })
              .send(template);
          }
        }
      }
    }

    if (process.env.NODE_ENV !== "production") {
      const source = await import("../server/_core/app");
      const { createApp } = source as any;
      if (typeof createApp !== "function") {
        throw new Error("Source createApp is not a function");
      }
      const app = createApp();
      if (typeof app !== "function") {
        throw new Error(
          `Source createApp() returned ${typeof app}, expected function`
        );
      }
      return app(req, res, next);
    }

    // Try to load the bundled createApp function
    // The dist/index.js gets bundled and included in the function package via vercel.json
    const bundled = require("../dist/index.cjs");
    const { createApp } = bundled as any;

    if (typeof createApp !== "function") {
      const exported = Object.keys(bundled || {});
      logger.error(
        { data: [typeof createApp, exported] },
        "[API] createApp is not a function"
      );
      throw new Error(
        `Invalid createApp ${
          exported.length > 0
            ? `(available: ${exported.join(", ")})`
            : "(module has no exports)"
        }`
      );
    }

    // Create the actual app and delegate the request
    const app = createApp();

    if (typeof app !== "function") {
      throw new Error(`createApp() returned ${typeof app}, expected function`);
    }
    return app(req, res, next);
  } catch (error: any) {
    logger.error(
      { data: [error?.message || String(error), error?.stack] },
      "[API] Error"
    );

    // Fallback for development: try loading from source
    if (process.env.NODE_ENV !== "production") {
      try {
        logger.warn("[API] Trying source as fallback...");
        const source = await import("../server/_core/app");
        const { createApp } = source as any;
        const app = createApp();
        return app(req, res, next);
      } catch (sourceError: any) {
        logger.error(
          { data: [sourceError?.message] },
          "[API] Source fallback also failed"
        );
      }
    }

    // Error: couldn't load server
    return res.status(500).json({
      error: "Failed to initialize server",
      message: error?.message || "Unknown error",
      ...(process.env.NODE_ENV !== "production" && {
        stack: error?.stack?.split("\n").slice(0, 3).join("\n"),
      }),
    });
  }
});

export default handler;
