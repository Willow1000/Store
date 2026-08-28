import express from "express";

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

export function isStaticAssetPath(pathname: string): boolean {
  return (
    /\.(?:css|js|mjs|map|png|jpg|jpeg|gif|webp|svg|ico|txt|xml|woff2?)$/i.test(
      pathname
    ) ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/images/")
  );
}

function getRateLimitClientKey(req: express.Request): string {
  const forwardedFor = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.header("x-real-ip")?.trim();
  return (
    forwardedFor || realIp || req.ip || req.socket.remoteAddress || "unknown"
  );
}

/**
 * Fixed-window request-count rate limiter.
 *
 * `isExempt` is a caller-supplied hook (rather than this module reaching
 * into app-specific routing to decide, e.g., "is this a feed/sitemap
 * request") so this stays a generic rate-limiting mechanism with no
 * knowledge of which routes exist in a given app.
 */
export function createRateLimitMiddleware(opts: {
  windowMs: number;
  max: number;
  pathPrefix?: string[];
  isExempt?: (req: express.Request) => boolean;
}) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (req.method === "OPTIONS" || isStaticAssetPath(req.path)) {
      return next();
    }

    // Keep the global limiter focused on mutating traffic; read endpoints (like feeds) can be high-volume.
    if (!opts.pathPrefix && (req.method === "GET" || req.method === "HEAD")) {
      return next();
    }

    if (opts.isExempt?.(req)) {
      return next();
    }

    if (
      opts.pathPrefix &&
      !opts.pathPrefix.some(prefix => req.path.startsWith(prefix))
    ) {
      return next();
    }

    const key = `${getRateLimitClientKey(req)}:${opts.pathPrefix?.[0] || "global"}`;
    const now = Date.now();
    const current = rateBuckets.get(key);

    if (!current || current.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > opts.max) {
      res.setHeader(
        "Retry-After",
        Math.ceil((current.resetAt - now) / 1000).toString()
      );
      return res.status(429).json({ error: "Too many requests" });
    }

    return next();
  };
}
