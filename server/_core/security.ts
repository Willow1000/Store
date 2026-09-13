import express from "express";
import { ENV } from "./env";
import { logger } from "./logger";

export function getRequestOrigin(req: express.Request): string | null {
  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.header("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.header("host");

  if (!protocol || !host) return null;
  return `${protocol}://${host}`;
}

/**
 * The site canonicalises to the www host (the apex 308-redirects to it), so
 * every machine-readable surface - robots.txt, llms.txt, both sitemaps - must
 * advertise www URLs. Emitting apex URLs made crawlers follow a redirect for
 * every discovery document and split signals across two hosts. Preview
 * deployments and localhost are left untouched.
 */
const CANONICAL_APEX_HOST = "motorvault.shop";
const CANONICAL_SITE_ORIGIN = `https://www.${CANONICAL_APEX_HOST}`;

function normalizeToCanonicalHost(origin: string): string {
  try {
    const url = new URL(origin);
    if (
      url.hostname === CANONICAL_APEX_HOST ||
      url.hostname === `www.${CANONICAL_APEX_HOST}`
    ) {
      return CANONICAL_SITE_ORIGIN;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return CANONICAL_SITE_ORIGIN;
  }
}

export function getSiteOrigin(req: express.Request): string {
  const resolved = (
    getRequestOrigin(req) ||
    ENV.siteUrl ||
    `${req.protocol}://${req.get("host")}`
  ).replace(/\/$/, "");
  return normalizeToCanonicalHost(resolved);
}

export async function verifyRecaptchaToken(
  token: string | undefined,
  remoteIp: string | undefined
): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret) {
    logger.warn(
      "[Contact] RECAPTCHA_SECRET_KEY not configured; skipping server-side CAPTCHA verification"
    );
    return true;
  }

  if (!token) return false;

  const params = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp) params.set("remoteip", remoteIp);

  try {
    const captchaRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );
    const body = await captchaRes.json().catch(() => null);
    if (!captchaRes.ok || !body?.success) {
      logger.warn(
        { data: [body || captchaRes.status] },
        "[Contact] CAPTCHA verification failed:"
      );
      return false;
    }
    return true;
  } catch (error) {
    logger.error({ data: [error] }, "[Contact] CAPTCHA verification error:");
    return false;
  }
}

export function isSameOriginRequest(req: express.Request): boolean {
  const originHeader = req.header("origin");
  if (!originHeader) return true;

  const requestOrigin = getRequestOrigin(req);
  if (!requestOrigin) return false;

  try {
    const originUrl = new URL(originHeader);
    const requestUrl = new URL(requestOrigin);
    if (originUrl.origin === requestUrl.origin) return true;

    const configuredOrigins = [
      ENV.siteUrl,
      process.env.VITE_APP_URL,
      process.env.APP_URL,
      process.env.VITE_SITE_URL,
      process.env.SITE_URL,
    ]
      .filter(Boolean)
      .map(value => {
        try {
          return new URL(String(value)).origin;
        } catch {
          return "";
        }
      })
      .filter(Boolean);

    if (configuredOrigins.includes(originUrl.origin)) return true;

    const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    const originLoopback = loopbackHosts.has(originUrl.hostname);
    const requestLoopback = loopbackHosts.has(requestUrl.hostname);
    const samePort = originUrl.port === requestUrl.port;

    // Allow localhost/127.0.0.1 interchangeably during local checkout testing.
    if (originLoopback && requestLoopback && samePort) return true;
    if (!ENV.isProduction && originLoopback && requestLoopback) return true;

    return false;
  } catch {
    return false;
  }
}

export function applySecurityHeaders(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(self), unload=*"
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  if (req.secure || req.header("x-forwarded-proto") === "https") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self' https://*.supabase.co https://checkout.paystack.com",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.trustindex.io https://api.blootrue.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://www.googleapis.com https://ajax.googleapis.com https://maps.googleapis.com https://maps.gstatic.com https://cdn.trustindex.io https://api.blootrue.com",
    "script-src-elem 'self' 'unsafe-inline' https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://www.googleapis.com https://ajax.googleapis.com https://maps.googleapis.com https://maps.gstatic.com https://cdn.trustindex.io https://api.blootrue.com",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https://www.google.com https://www.facebook.com https://api.blootrue.com",
    "media-src 'self' https: data: blob:",
    "object-src 'none'",
    "require-trusted-types-for 'script'",
    "trusted-types default",
    "upgrade-insecure-requests",
  ].join("; ");

  res.setHeader("Content-Security-Policy", csp);
  next();
}

export function isValidConfiguredOrigin(value: string | undefined): boolean {
  if (!value) return false;

  const normalized = value.trim().replace(/\/$/, "");
  if (!normalized || normalized.includes("your-production-domain.com")) {
    return false;
  }

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
