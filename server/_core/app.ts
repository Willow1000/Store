import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import {
  verifyTransaction,
  initializeTransaction,
  buildPaystackCallbackUrl,
} from "../paystack";
import { constructWebhookEvent, stripe } from "../stripe";
import { generateSitemap } from "../sitemap";
import { sdk } from "./sdk";
import { ENV } from "./env";
import {
  getDb,
  createOrder,
  createPayment,
  getUserById,
  getUserByOpenId,
  resolveOfferByCode,
  recordProductSearchTrackingEvent,
  recentSimilarTrackingExists,
  clearUserCart,
} from "../db";
import {
  sendContactConfirmationEmail,
  sendTicketConfirmationEmail,
  sendContactAdminNotification,
} from "./emailService";
import {
  sanitizeEmail,
  sanitizeLocation,
  sanitizeMultilineText,
  sanitizeName,
  sanitizePhone,
  sanitizeText,
} from "@shared/sanitize";
import { calculateShipping } from "@shared/shipping";
import { buildRobotsTxt, buildLlmsTxt, FEED_SHIPPING_COUNTRIES } from "./seo";

import { logger } from "./logger";
// In production, silence non-error console output to avoid leaking debug info.
if (process.env.NODE_ENV === "production") {
  try {
    (console as any).debug = () => {};
    (console as any).log = () => {};
    (console as any).info = () => {};
  } catch (e) {
    // ignore
  }
}

function getRequestOrigin(req: express.Request): string | null {
  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.header("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.header("host");

  if (!protocol || !host) return null;
  return `${protocol}://${host}`;
}

function getSiteOrigin(req: express.Request): string {
  return (
    getRequestOrigin(req) ||
    ENV.siteUrl ||
    `${req.protocol}://${req.get("host")}`
  ).replace(/\/$/, "");
}

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

function isStaticAssetPath(pathname: string): boolean {
  return (
    /\.(?:css|js|mjs|map|png|jpg|jpeg|gif|webp|svg|ico|txt|xml|woff2?)$/i.test(
      pathname
    ) ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/images/")
  );
}

// Note: this is intentionally NOT the createRateLimitMiddleware in
// ./rateLimit.ts - that extraction diverged from this one (a narrower
// isFeedRequest/getRateLimitClientKey than the getCandidateRequestPaths-based
// versions this file actually uses elsewhere for feed/sitemap routing), so
// swapping it in would silently change which requests get rate-limited.
function createRateLimitMiddleware(opts: {
  windowMs: number;
  max: number;
  pathPrefix?: string[];
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

    // Feed endpoints are consumed by bots/integrations and should not be throttled by app API limits.
    if (isFeedRequest(req)) {
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

function isValidEmailAddress(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyRecaptchaToken(
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

function isSameOriginRequest(req: express.Request): boolean {
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

function applySecurityHeaders(
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

function isValidConfiguredOrigin(value: string | undefined): boolean {
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

async function insertProductSearchTrackingEventToSupabase(entry: {
  sessionId: string;
  userId: string | null;
  eventType: string;
  searchTerm: string | null;
  filters: Record<string, unknown>;
  resultsCount: number;
  matchedProductIds: Array<string | number>;
  clickedProductId: string | null;
  pageUrl: string | null;
  referrer: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
}): Promise<boolean> {
  const supabaseUrl =
    ENV.supabaseUrl ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const serviceKey =
    ENV.supabaseServiceKey ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!supabaseUrl || !serviceKey) {
    return false;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/product_search_tracking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        sessionid: entry.sessionId,
        userid: entry.userId,
        eventtype: entry.eventType,
        searchterm: entry.searchTerm,
        filters: entry.filters,
        resultscount: entry.resultsCount,
        matchedproductids: entry.matchedProductIds,
        clickedproductid: entry.clickedProductId,
        pageurl: entry.pageUrl,
        referrer: entry.referrer,
        useragent: entry.userAgent,
        metadata: entry.metadata,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.warn(
      { data: [response.status, errorText] },
      "[Track] Supabase REST insert failed:"
    );
    return false;
  }

  return true;
}

function getFeedOrigin(req: express.Request): string {
  const preferredFeedOrigin = "https://motorvault.shop";
  if (isValidConfiguredOrigin(preferredFeedOrigin)) {
    return preferredFeedOrigin.replace(/\/$/, "");
  }

  const configuredOrigin = ENV.siteUrl?.trim();
  if (isValidConfiguredOrigin(configuredOrigin)) {
    return configuredOrigin.replace(/\/$/, "");
  }

  return (
    getRequestOrigin(req) || `${req.protocol}://${req.get("host")}`
  ).replace(/\/$/, "");
}

type FeedProduct = {
  id?: string | number;
  uuid?: string | number;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  summary?: string | null;
  short_description?: string | null;
  specifics?: string | null;
  price?: string | number | null;
  stock?: string | number | null;
  url?: string | null;
  link?: string | null;
  cover_image_url?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  images?: unknown;
  condition?: string | null;
  brand?: string | null;
  google_product_category?: string | null;
  category?: string | null;
  category_name?: string | null;
  sale_price?: string | number | null;
  item_group_id?: string | number | null;
  sku?: string | null;
  part_number?: string | null;
  color?: string | null;
  size?: string | null;
  age_group?: string | null;
  gender?: string | null;
  shipping_country?: string | null;
  shipping_service?: string | null;
  shipping_price?: string | number | null;
  custom_label_0?: string | null;
  gtin?: string | null;
  upc?: string | null;
  ean?: string | null;
  mpn?: string | null;
  manufacturer_part_number?: string | null;
  status?: string | null;
  model?: string | null;
  item_specifics?: Record<string, unknown> | string | null;
  original_price?: string | number | null;
  originalprice?: string | number | null;
  discount?: string | number | null;
};

function escapeXml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&apos;",
        '"': "&quot;",
      })[character] || character
  );
}

function resolveUrl(value: unknown, origin: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
}

function toTitleCase(input: string): string {
  return String(input || "")
    .toLowerCase()
    .split(/\s+/)
    .map(w => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
    .trim();
}

function normalizePrice(value: unknown, currency: string = "USD"): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return `${amount.toFixed(2)} ${currency}`;
}

type FeedLanguage = "ENG" | "ESP" | "FRA" | "GER" | "ITA";
type FeedCurrency = string;

function normalizeFeedLanguage(value: unknown): FeedLanguage {
  const lang = String(value || "ENG")
    .trim()
    .toUpperCase();

  if (lang === "ESP" || lang === "ES" || lang === "SPANISH") return "ESP";
  if (lang === "FRA" || lang === "FR" || lang === "FRENCH") return "FRA";
  if (lang === "GER" || lang === "DE" || lang === "DEU" || lang === "GERMAN")
    return "GER";
  if (lang === "ITA" || lang === "IT" || lang === "ITALIAN") return "ITA";
  return "ENG";
}

function normalizeFeedCurrency(value: unknown): string {
  const currency = String(value || "USD")
    .trim()
    .toUpperCase();
  if (/^[A-Z]{3}$/.test(currency)) return currency;
  return "USD";
}

const feedCurrencyCache = new Map<string, { rate: number; expires: number }>();
const FEED_CURRENCY_CACHE_TTL = 1000 * 60 * 15; // 15 minutes

async function fetchFeedExchangeRate(
  targetCurrency: string,
  baseCurrency = "USD"
): Promise<number | null> {
  const target = targetCurrency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(target)) return null;
  if (target === baseCurrency.toUpperCase()) return 1;

  const apiKey =
    ENV.currencyApiKey ||
    process.env.VITE_CURRENCY_API_KEY ||
    process.env.CURRENCY_API_KEY ||
    "";
  if (apiKey) {
    try {
      const url = `https://api.freecurrencyapi.com/v1/latest?apikey=${encodeURIComponent(apiKey)}&currencies=${encodeURIComponent(target)}&base_currency=${encodeURIComponent(baseCurrency)}`;
      const response = await fetch(url);
      if (response.ok) {
        const json = await response.json();
        if (json && json.data && typeof json.data[target] === "number") {
          return Number(json.data[target]);
        }
      }
    } catch {
      // ignore and fall back
    }
  }

  try {
    const fallbackUrl = `https://api.exchangerate.host/latest?base=${encodeURIComponent(baseCurrency)}&symbols=${encodeURIComponent(target)}`;
    const response = await fetch(fallbackUrl);
    if (response.ok) {
      const json = await response.json();
      if (json && json.rates && typeof json.rates[target] === "number") {
        return Number(json.rates[target]);
      }
    }
  } catch {
    // ignore and fall back
  }

  return null;
}

async function getFeedCurrencyRate(currency: string): Promise<number> {
  const code = normalizeFeedCurrency(currency);
  if (code === "USD") return 1;

  const now = Date.now();
  const cached = feedCurrencyCache.get(code);
  if (cached && cached.expires > now) {
    return cached.rate;
  }

  const rate = await fetchFeedExchangeRate(code, "USD");
  if (rate && Number.isFinite(rate) && rate > 0) {
    feedCurrencyCache.set(code, {
      rate,
      expires: now + FEED_CURRENCY_CACHE_TTL,
    });
    return rate;
  }

  return 1;
}

async function convertUsdAmount(
  amount: number,
  targetCurrency: string
): Promise<number> {
  const rate = await getFeedCurrencyRate(targetCurrency);
  return Number((amount * rate).toFixed(2));
}

function convertUsdAmountWithRate(amount: number, rate: number): number {
  return Number((amount * rate).toFixed(2));
}

function mapFeedLanguageToTargetCode(lang: FeedLanguage): string {
  switch (lang) {
    case "ESP":
      return "es";
    case "FRA":
      return "fr";
    case "GER":
      return "de";
    case "ITA":
      return "it";
    default:
      return "en";
  }
}

async function translateTextNode(
  text: string,
  targetLanguage: string
): Promise<string> {
  const trimmed = String(text || "").trim();
  if (!trimmed || targetLanguage === "en") return trimmed;

  try {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "auto");
    url.searchParams.set("tl", targetLanguage);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", trimmed);

    const response = await fetch(url.toString());
    if (!response.ok) return trimmed;

    const json = await response.json();
    if (!Array.isArray(json) || !Array.isArray(json[0])) return trimmed;

    const translated = (json[0] as unknown[])
      .map(segment => (Array.isArray(segment) ? String(segment[0] ?? "") : ""))
      .join("")
      .trim();

    return translated || trimmed;
  } catch {
    return trimmed;
  }
}

async function translateFeedTexts(
  targetLanguage: string,
  values: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (targetLanguage === "en") {
    values.forEach(value => result.set(value, value));
    return result;
  }

  const uniqueValues = Array.from(
    new Set(values.filter(value => typeof value === "string" && value.trim()))
  );
  const batchSize = 4;

  for (let i = 0; i < uniqueValues.length; i += batchSize) {
    const batch = uniqueValues.slice(i, i + batchSize);
    const translations = await Promise.all(
      batch.map(value => translateTextNode(value, targetLanguage))
    );
    translations.forEach((translated, index) => {
      result.set(batch[index], translated);
    });
  }

  uniqueValues.forEach(value => {
    if (!result.has(value)) result.set(value, value);
  });

  return result;
}

function getFeedChannelCopy(lang: FeedLanguage): {
  title: string;
  description: string;
} {
  const copy: Record<FeedLanguage, { title: string; description: string }> = {
    ENG: {
      title: "MotorVault Product Feed",
      description:
        "Product catalog for Google, Facebook, TikTok, and Pinterest",
    },
    ESP: {
      title: "Feed de Productos MotorVault",
      description:
        "Catalogo de productos para Google, Facebook, TikTok y Pinterest",
    },
    FRA: {
      title: "Flux Produits MotorVault",
      description:
        "Catalogue de produits pour Google, Facebook, TikTok et Pinterest",
    },
    GER: {
      title: "MotorVault Produkt-Feed",
      description: "Produktkatalog fur Google, Facebook, TikTok und Pinterest",
    },
    ITA: {
      title: "Feed Prodotti MotorVault",
      description: "Catalogo prodotti per Google, Facebook, TikTok e Pinterest",
    },
  };

  return copy[lang] || copy.ENG;
}

function resolvePreferredEmailLanguage(
  req: express.Request,
  explicitValue?: unknown
): string {
  const preferred = String(explicitValue || req.header("accept-language") || "")
    .trim()
    .toLowerCase();
  if (!preferred) return "en";

  if (preferred.startsWith("es")) return "es";
  if (preferred.startsWith("fr")) return "fr";
  if (preferred.startsWith("de")) return "de";
  if (preferred.startsWith("it")) return "it";
  if (preferred.startsWith("nl")) return "nl";
  return "en";
}

function formatLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function stringifySpecificValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    const joined = value
      .map(entry => String(entry ?? "").trim())
      .filter(Boolean)
      .join(", ");
    return joined;
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value).trim();
}

function parseLooseSpecificsText(rawValue: string): Record<string, string> {
  const normalized = rawValue
    .replace(/[{}]/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[\t]+/g, " ")
    .replace(/\s*\|\s*/g, "\n")
    .replace(/\s*;\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

  if (!normalized) return {};

  const lines = normalized
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  const parsed: Record<string, string> = {};
  let detailIndex = 1;

  for (const line of lines) {
    const segment = line.replace(/^[-*+•]\s*/, "").trim();
    if (!segment) continue;

    const keyValueMatch = segment.match(/^([^:=]+?)\s*[:=]\s*(.+)$/);
    if (keyValueMatch) {
      const key = formatLabel(keyValueMatch[1]);
      const value = keyValueMatch[2].trim();
      if (!key || !value) continue;
      parsed[key] = parsed[key] ? `${parsed[key]}, ${value}` : value;
      continue;
    }

    parsed[`Detail ${detailIndex}`] = segment;
    detailIndex += 1;
  }

  return parsed;
}

function parseItemSpecifics(
  value: FeedProduct["item_specifics"]
): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return {};
  }

  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to tolerant text parsing.
  }

  const normalizedJsonLike = trimmed
    .replace(/([{,]\s*)([A-Za-z0-9_\-\s]+)\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"')
    .replace(/,\s*}/g, "}");

  try {
    const parsed = JSON.parse(normalizedJsonLike);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall back to key/value line parser.
  }

  return parseLooseSpecificsText(trimmed);
}

function buildFeedDescription(product: FeedProduct): string {
  const parsedSpecifics = parseItemSpecifics(product.item_specifics);
  const specificsLines = Object.entries(parsedSpecifics)
    .map(([key, value]) => {
      const rendered = stringifySpecificValue(value)
        .replace(/\s+/g, " ")
        .replace(/\s+,/g, ",")
        .trim();
      if (!rendered) return "";
      return `${formatLabel(key)}: ${rendered}`;
    })
    .filter(Boolean);

  if (specificsLines.length === 0) {
    return "Item specifics not provided";
  }

  return specificsLines.join("\n").slice(0, 5000);
}

function getAppleMerchantAssociationPath(): string {
  return path.resolve(
    process.cwd(),
    "server/_core/apple-developer-merchantid-domain-association"
  );
}

function getOriginalPath(req: express.Request): string {
  return (
    req.header("x-original-url") ||
    req.header("x-forwarded-url") ||
    req.path ||
    ""
  );
}

function normalizeRequestPath(input: string | undefined | null): string {
  if (!input) return "";
  const normalized = String(input).trim();
  if (!normalized) return "";
  return normalized.split("?")[0] || "";
}

function getCandidateRequestPaths(req: express.Request): string[] {
  const candidates = [getOriginalPath(req), req.originalUrl, req.url, req.path]
    .map(value => normalizeRequestPath(value))
    .filter(Boolean);

  return Array.from(new Set(candidates));
}

function isFeedRequest(req: express.Request): boolean {
  return getCandidateRequestPaths(req).includes("/feed.xml");
}

function getRateLimitClientKey(req: express.Request): string {
  const forwardedFor = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.header("x-real-ip")?.trim();
  return (
    forwardedFor || realIp || req.ip || req.socket.remoteAddress || "unknown"
  );
}

async function getFeedProducts(): Promise<FeedProduct[]> {
  if (!ENV.supabaseUrl) {
    logger.warn("[Feed] Supabase URL is not configured");
    return [];
  }

  const supabase = createClient(
    ENV.supabaseUrl,
    ENV.supabaseServiceKey || ENV.supabaseAnonKey || ""
  );

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      logger.warn(
        { data: [error.message] },
        "[Feed] Supabase product lookup failed:"
      );
      return [];
    }

    return Array.isArray(data) ? (data as FeedProduct[]) : [];
  } catch (error) {
    logger.warn({ data: [error] }, "[Feed] Supabase feed lookup failed:");
    return [];
  }
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  // Stripe webhook: must be registered (with its raw-body parser) before
  // the global express.json() below - body parsers consume the request
  // stream once, so if the global JSON parser ran first, this route's
  // express.raw() would receive an already-drained (empty) body and
  // Stripe's signature verification would fail on every event.
  // Stripe Webhook Endpoint
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req: express.Request, res: express.Response) => {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!sig || !webhookSecret) {
        logger.warn("[Stripe Webhook] Missing signature or webhook secret");
        return res
          .status(400)
          .json({ error: "Missing signature or webhook secret" });
      }

      let event: any;
      try {
        event = await constructWebhookEvent(
          req.body as Buffer,
          sig as string,
          webhookSecret
        );
      } catch (err: any) {
        logger.error(
          { data: [err.message] },
          "[Stripe Webhook] Signature verification failed:"
        );
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      // Handle different event types
      if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        logger.info(
          { data: [paymentIntent.id] },
          "[Stripe Webhook] Payment succeeded:"
        );

        try {
          const userId = Number(paymentIntent.metadata?.user_id ?? NaN);
          const stripePaymentIntentId = paymentIntent.id;
          const totalAmount = (paymentIntent.amount / 100).toFixed(2);
          const subtotalAmount = Number(
            paymentIntent.metadata?.subtotal ?? totalAmount
          );
          const shippingCost = Number(paymentIntent.metadata?.shipping ?? 0);
          const taxAmount = Number(paymentIntent.metadata?.tax ?? 0);
          const submittedOfferCode = paymentIntent.metadata?.offerCode
            ? String(paymentIntent.metadata.offerCode).trim()
            : "";
          const resolvedOffer = submittedOfferCode
            ? await resolveOfferByCode(submittedOfferCode, subtotalAmount)
            : null;
          const discountAmount = resolvedOffer?.discountAmount ?? 0;
          const offerId = resolvedOffer?.id ?? null;
          const offerCode =
            resolvedOffer?.code ??
            (submittedOfferCode ? submittedOfferCode.toUpperCase() : null);

          let customerEmail = String(
            paymentIntent.metadata?.email || paymentIntent.receipt_email || ""
          );
          let customerName = String(paymentIntent.metadata?.name || "");

          if (!userId || userId <= 0) {
            logger.error(
              { data: [paymentIntent.metadata?.user_id] },
              "[Stripe Webhook] Invalid user_id in metadata:"
            );
            return res
              .status(400)
              .json({ error: "Invalid user_id in payment intent metadata" });
          }

          if (!customerEmail && userId) {
            try {
              const dbUser = await getUserById(userId);
              customerEmail = String(dbUser?.email || "");
              if (!customerName) {
                customerName = String(dbUser?.name || "");
              }
            } catch (lookupErr) {
              logger.warn(
                { data: [lookupErr] },
                "[Stripe Webhook] Failed to resolve user email:"
              );
            }
          }

          const orderLineItems = Array.isArray(paymentIntent.metadata?.items)
            ? JSON.parse(paymentIntent.metadata.items)
                .map((item: any) => ({
                  productId: Number(item.productId),
                  variantId: item.variantId
                    ? Number(item.variantId)
                    : undefined,
                  quantity: Number(item.quantity || 1),
                  price: item.price,
                }))
                .filter(
                  (item: any) =>
                    Number.isFinite(item.productId) && item.productId > 0
                )
            : [];

          // Create the order first so the payment record can reference its real id
          let orderId: number | null = null;
          try {
            if (orderLineItems.length === 0) {
              logger.warn(
                "[Stripe Webhook] No order line items found in payment metadata"
              );
            }

            const orderNumber = `STR-${Date.now()}-${randomUUID().slice(0, 8)}`;
            const createdOrder = await createOrder(
              userId,
              {
                orderNumber,
                subtotal: subtotalAmount.toString(),
                shippingCost: shippingCost.toString(),
                tax: taxAmount.toString(),
                total: totalAmount,
                discountAmount: discountAmount.toString(),
                offerId,
                offerCode: offerCode || undefined,
                shippingAddress: paymentIntent.metadata?.shippingAddress
                  ? JSON.parse(paymentIntent.metadata.shippingAddress)
                  : {},
                billingAddress: paymentIntent.metadata?.billingAddress
                  ? JSON.parse(paymentIntent.metadata.billingAddress)
                  : {},
                paymentMethod: "stripe",
                stripePaymentIntentId,
                language: paymentIntent.metadata?.language,
              } as any,
              customerEmail,
              customerName,
              orderLineItems
            );

            orderId = createdOrder?.id ?? null;
            logger.info(
              { data: [orderId] },
              "[Stripe Webhook] Order created successfully:"
            );
          } catch (orderErr: any) {
            logger.error(
              { data: [orderErr?.message] },
              "[Stripe Webhook] Failed to create order:"
            );
            // Log but don't fail the webhook - payment was successful
          }

          try {
            const paymentRecord = await createPayment(orderId ?? 0, userId, {
              provider: "stripe",
              reference: stripePaymentIntentId,
              amount: Number(totalAmount) as any,
              currency: paymentIntent.currency?.toUpperCase() || "USD",
              status: paymentIntent.status,
              channel: paymentIntent.payment_method_types?.[0] || "card",
              gatewayResponse: "Stripe API - Payment Succeeded",
              authorizationCode:
                (paymentIntent.charges?.data?.[0] as any)?.id || null,
              cardBin:
                (paymentIntent.payment_method_details?.card as any)?.first6 ||
                null,
              cardLast4:
                (paymentIntent.payment_method_details?.card as any)?.last4 ||
                null,
              cardBrand:
                (paymentIntent.payment_method_details?.card as any)?.brand ||
                null,
              bank: null,
              ipAddress: null,
              metadata: JSON.stringify(paymentIntent.metadata || {}),
              fees: 0 as any,
              paidAt: new Date(paymentIntent.created * 1000),
            });

            logger.info(
              { data: [paymentRecord] },
              "[Stripe Webhook] Payment recorded:"
            );
          } catch (paymentErr: any) {
            logger.error(
              { data: [paymentErr?.message] },
              "[Stripe Webhook] Failed to record payment:"
            );
            // Continue even if payment record fails - order was already created
          }

          res.status(200).json({ received: true });
        } catch (err: any) {
          logger.error(
            { data: [err?.message] },
            "[Stripe Webhook] Error processing payment_intent.succeeded:"
          );
          res.status(500).json({ error: "Internal server error" });
        }
      } else if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object;
        logger.warn(
          {
            data: [paymentIntent.id, paymentIntent.last_payment_error?.message],
          },
          "[Stripe Webhook] Payment failed:"
        );

        try {
          const userId = Number(paymentIntent.metadata?.user_id ?? NaN);

          if (userId > 0) {
            const paymentRecord = await createPayment(0, userId, {
              provider: "stripe",
              reference: paymentIntent.id,
              amount: (paymentIntent.amount / 100).toFixed(2) as any,
              currency: paymentIntent.currency?.toUpperCase() || "USD",
              status: "failed",
              channel: paymentIntent.payment_method_types?.[0] || "card",
              gatewayResponse:
                paymentIntent.last_payment_error?.message || "Payment failed",
              authorizationCode: null,
              cardBin: null,
              cardLast4:
                (paymentIntent.payment_method_details?.card as any)?.last4 ||
                null,
              cardBrand:
                (paymentIntent.payment_method_details?.card as any)?.brand ||
                null,
              bank: null,
              ipAddress: null,
              metadata: JSON.stringify(paymentIntent.metadata || {}),
              fees: 0 as any,
              paidAt: null,
            });

            logger.info("[Stripe Webhook] Failed payment recorded");
          }
        } catch (err: any) {
          logger.error(
            { data: [err?.message] },
            "[Stripe Webhook] Error recording failed payment:"
          );
        }

        res.status(200).json({ received: true });
      } else {
        // Ignore other event types
        res.status(200).json({ received: true });
      }
    }
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(applySecurityHeaders);
  app.use(createRateLimitMiddleware({ windowMs: 10 * 60 * 1000, max: 600 }));
  app.use(
    createRateLimitMiddleware({
      windowMs: 10 * 60 * 1000,
      max: 90,
      pathPrefix: [
        "/api/trpc",
        "/api/track",
        "/initialize-payment",
        "/payment/callback",
        "/api/webhooks",
      ],
    })
  );
  app.use(
    createRateLimitMiddleware({
      windowMs: 10 * 60 * 1000,
      max: 8,
      pathPrefix: ["/api/contact-us"],
    })
  );
  app.use((req, res, next) => {
    const unsafeMethod = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    if (!unsafeMethod) {
      return next();
    }

    if (!isSameOriginRequest(req)) {
      return res.status(403).json({ error: "Blocked cross-site request" });
    }

    return next();
  });

  app.use((req, res, next) => {
    const originalPath = getOriginalPath(req);

    if (
      originalPath ===
      "/.well-known/apple-developer-merchantid-domain-association"
    ) {
      const associationPath = getAppleMerchantAssociationPath();

      try {
        const association = fs.readFileSync(associationPath, "utf-8");
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.status(200).send(association);
      } catch (error) {
        logger.error(
          { data: [error] },
          "[Apple Merchant] Failed to read association file:"
        );
        return res.status(500).send("Failed to load association file");
      }
    }

    if (isFeedRequest(req)) {
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    }

    return next();
  });

  app.get("/robots.txt", (req, res) => {
    const origin = getSiteOrigin(req);
    res.type("text/plain").send(buildRobotsTxt(origin));
  });

  app.get("/llms.txt", (req, res) => {
    const origin = getSiteOrigin(req);
    res.type("text/plain").send(buildLlmsTxt(origin));
  });

  app.get("/sitemap.xml", async (req, res) => {
    const origin = getSiteOrigin(req);
    try {
      const xml = await generateSitemap(origin, "site");
      res.type("application/xml").send(xml);
    } catch (error) {
      logger.error(
        { data: [error] },
        "[Sitemap] Failed to generate sitemap.xml:"
      );
      res.status(500).type("text/plain").send("Failed to generate sitemap");
    }
  });

  app.get("/sitemap-products.xml", async (req, res) => {
    const origin = getSiteOrigin(req);
    try {
      const xml = await generateSitemap(origin, "products");
      res.type("application/xml").send(xml);
    } catch (error) {
      logger.error(
        { data: [error] },
        "[Sitemap] Failed to generate sitemap-products.xml:"
      );
      res.status(500).type("text/plain").send("Failed to generate sitemap");
    }
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Paystack redirect callback: verify reference and create order for authenticated user
  app.get(
    "/payment/callback",
    async (req: express.Request, res: express.Response) => {
      const reference = String(req.query.reference ?? "");
      if (!reference) {
        return res.status(400).send("Missing reference");
      }

      try {
        const verification = await verifyTransaction(reference);

        if (!verification || !verification.data) {
          logger.error(
            { data: [reference] },
            "[Paystack] Empty verification response for"
          );
          return res.status(502).send("Failed to verify transaction");
        }

        const status = String(
          (verification.data as any).status || ""
        ).toLowerCase();
        if (status !== "success") {
          const pendingStatuses = new Set([
            "ongoing",
            "pending",
            "processing",
            "queued",
          ]);
          const failedStatuses = new Set(["abandoned", "failed", "reversed"]);
          const paymentState = pendingStatuses.has(status)
            ? "pending"
            : failedStatuses.has(status)
              ? "failed"
              : "failed";
          logger.warn(
            { data: [reference, status] },
            "[Paystack] Transaction not successful:"
          );
          return res.redirect(
            `/payment/failed?payment=${paymentState}&reference=${encodeURIComponent(reference)}&status=${encodeURIComponent(status)}`
          );
        }

        const paystackData = verification.data as any;
        const paymentMetadata =
          paystackData.metadata && typeof paystackData.metadata === "object"
            ? paystackData.metadata
            : {};

        // Try to authenticate the user via SDK session cookie first.
        // If the browser session is not available after third-party redirects,
        // fall back to verified metadata identifiers attached at initialization.
        let userId: number | null = null;
        try {
          const user = await sdk.authenticateRequest(req as any);
          if (user && (user as any).id) userId = (user as any).id;
        } catch (authErr) {
          logger.warn(
            "[Payment Callback] User not authenticated via SDK session"
          );
        }

        if (!userId) {
          const metadataDbUserId = Number(
            (paymentMetadata as any).userDbId ??
              (paymentMetadata as any).userId ??
              NaN
          );
          if (Number.isFinite(metadataDbUserId) && metadataDbUserId > 0) {
            userId = metadataDbUserId;
          }
        }

        if (!userId) {
          const metadataUserOpenId = String(
            (paymentMetadata as any).userOpenId || ""
          ).trim();
          if (metadataUserOpenId) {
            try {
              const dbUser = await getUserByOpenId(metadataUserOpenId);
              if (dbUser?.id) userId = dbUser.id;
            } catch (lookupErr) {
              logger.warn(
                { data: [lookupErr] },
                "[Payment Callback] Failed metadata openId user lookup:"
              );
            }
          }
        }

        if (!userId) {
          logger.error(
            "[Payment Callback] Cannot create order without authenticated user"
          );
          return res.redirect(
            `/checkout?payment=needs_auth&reference=${encodeURIComponent(reference)}`
          );
        }

        const amountCents = paystackData.amount as number;
        const totalAmount = Number((amountCents / 100).toFixed(2));
        const subtotalAmount = Number(paymentMetadata.subtotal ?? totalAmount);
        const shippingCost = Number(paymentMetadata.shipping ?? 0);
        const taxAmount = Number(paymentMetadata.tax ?? 0);
        const submittedOfferCode = paymentMetadata.offerCode
          ? String(paymentMetadata.offerCode).trim()
          : "";
        const resolvedOffer = submittedOfferCode
          ? await resolveOfferByCode(submittedOfferCode, subtotalAmount)
          : null;
        const discountAmount = resolvedOffer?.discountAmount ?? 0;
        const offerId = resolvedOffer?.id ?? null;
        const offerCode =
          resolvedOffer?.code ??
          (submittedOfferCode ? submittedOfferCode.toUpperCase() : null);
        const preferredEmailLanguage = resolvePreferredEmailLanguage(
          req,
          paymentMetadata.language
        );
        let customerEmail = String(
          paymentMetadata.email ||
            paystackData.customer?.email ||
            paystackData.email ||
            ""
        );
        let customerName = String(
          paymentMetadata.name || paystackData.customer?.name || ""
        );

        if (!customerEmail && userId) {
          try {
            const dbUser = await getUserById(userId);
            customerEmail = String(dbUser?.email || "");
            if (!customerName) {
              customerName = String(dbUser?.name || "");
            }
          } catch (lookupErr) {
            logger.warn(
              { data: [lookupErr] },
              "[Payment Callback] Failed to resolve user email for order confirmation:"
            );
          }
        }
        const orderLineItems = Array.isArray(paymentMetadata.items)
          ? paymentMetadata.items
              .map((item: any) => ({
                productId: Number(item.productId),
                variantId: item.variantId ? Number(item.variantId) : undefined,
                quantity: Number(item.quantity || 1),
                price: item.price,
              }))
              .filter(
                (item: any) =>
                  Number.isFinite(item.productId) && item.productId > 0
              )
          : [];

        let paymentId: string | null = null;
        let orderId: number | null = null;

        // STEP 1: Record payment details FIRST
        try {
          const paymentRecord = await createPayment(0, userId, {
            provider: "paystack",
            reference: paystackData.reference,
            amount: totalAmount as any,
            currency: paystackData.currency || "USD",
            status: paystackData.status,
            channel: paystackData.channel || "card",
            gatewayResponse: paystackData.gateway_response,
            authorizationCode: paystackData.authorization?.authorization_code,
            cardBin: paystackData.authorization?.bin,
            cardLast4: paystackData.authorization?.last4,
            cardBrand: paystackData.authorization?.brand,
            bank: paystackData.authorization?.bank,
            ipAddress: paystackData.ip_address,
            metadata: paystackData.metadata
              ? JSON.stringify(paystackData.metadata)
              : null,
            fees: (paystackData.fees
              ? Number(paystackData.fees) / 100
              : 0) as any,
            paidAt: paystackData.paid_at
              ? new Date(paystackData.paid_at)
              : null,
          });
        } catch (paymentErr) {
          logger.error(
            { data: [paymentErr] },
            "[Payment Callback] Failed to record payment:"
          );
          return res
            .status(500)
            .send("Payment verified but failed to record payment details");
        }

        // STEP 2: Create order AFTER payment is recorded
        try {
          const orderNumber = `PKS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

          const result = await createOrder(
            userId,
            {
              orderNumber,
              status: "confirmed",
              subtotal: String(subtotalAmount),
              shippingCost: String(shippingCost),
              tax: String(taxAmount),
              total: String(totalAmount),
              discountAmount: String(discountAmount),
              offerId,
              offerCode,
              paymentMethod: "paystack",
              paystackPaymentId: paystackData.reference,
              shippingAddress: null,
              billingAddress: null,
              trackingNumber: null,
            },
            customerEmail,
            customerName,
            orderLineItems,
            preferredEmailLanguage
          );
        } catch (orderErr) {
          logger.error(
            { data: [orderErr] },
            "[Payment Callback] Failed to create order:"
          );
          return res
            .status(500)
            .send("Payment recorded but failed to create order");
        }

        // STEP 3: Clear cart after confirmed payment and successful order creation.
        try {
          await clearUserCart(userId);
        } catch (clearCartErr) {
          logger.error(
            { data: [clearCartErr] },
            "[Payment Callback] Failed to clear cart:"
          );
        }

        // Redirect to success and include confirmed recipient email for immediate on-site confirmation copy.
        const successParams = new URLSearchParams({
          payment: "success",
          reference,
        });
        if (customerEmail) {
          successParams.set("email", customerEmail);
        }
        return res.redirect(`/payment/success?${successParams.toString()}`);
      } catch (err) {
        logger.error({ data: [err] }, "[Payment Callback] Verification error:");
        return res.status(500).send("Payment verification failed");
      }
    }
  );

  // POST /initialize-payment - simple Express endpoint for initializing Paystack transactions
  app.post(
    "/initialize-payment",
    async (req: express.Request, res: express.Response) => {
      const { email, amount } = req.body ?? {};

      if (!email || !amount) {
        return res
          .status(400)
          .json({ error: "Missing email or amount in request body" });
      }

      try {
        const requestOrigin = getRequestOrigin(req);
        // initializeTransaction expects amount in base units (e.g., 500 for 500.00), it will convert to kobo
        const paymentData = await initializeTransaction({
          email: String(email),
          amount: Number(amount),
          callback_url: buildPaystackCallbackUrl(requestOrigin),
        });

        return res.status(200).json(paymentData);
      } catch (error: any) {
        logger.error(
          { data: [error?.message ?? error] },
          "[Initialize Payment] Error initializing transaction:"
        );
        return res
          .status(500)
          .json({ error: error?.message ?? "Failed to initialize payment" });
      }
    }
  );

  app.get(
    "/api/debug/paystack/probe",
    async (req: express.Request, res: express.Response) => {
      const email = String(req.query.email ?? "").trim();
      const amount = Number(req.query.amount ?? 0);
      const reference = String(req.query.reference ?? "").trim() || undefined;
      const currency = String(req.query.currency ?? "USD").trim() || "USD";
      const description =
        String(req.query.description ?? "").trim() || undefined;

      if (!email || !amount) {
        return res.status(400).json({
          ok: false,
          error: "Missing email or amount query parameter",
        });
      }

      try {
        const requestOrigin = getRequestOrigin(req);
        const response = await initializeTransaction({
          email,
          amount,
          reference,
          currency,
          description,
          callback_url: buildPaystackCallbackUrl(requestOrigin),
        });

        return res.status(200).json({
          ok: true,
          request: {
            email,
            amount,
            reference: reference || null,
            currency,
            description: description || null,
            callbackUrl: buildPaystackCallbackUrl(requestOrigin) || null,
          },
          response,
        });
      } catch (error: any) {
        const message =
          error?.message ?? "Failed to probe Paystack initialization";
        logger.error({ data: [message] }, "[Paystack Debug Probe] Error:");
        return res.status(500).json({
          ok: false,
          request: {
            email,
            amount,
            reference: reference || null,
            currency,
            description: description || null,
          },
          error: message,
        });
      }
    }
  );

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Simple tracking endpoint used by frontend to record searches and clicks
  // Tracking endpoint writes directly to Postgres so it works on the deployed domain too.
  app.post("/api/track", async (req, res) => {
    try {
      const payload = req.body || {};
      const eventType = String(payload.eventType || "search").slice(0, 32);

      // Normalize payload fields
      const entry: any = {
        sessionId:
          String(payload.sessionId || "") || req.headers["x-session-id"] || "",
        userId: payload.userId || null,
        eventType,
        searchTerm: payload.searchTerm || null,
        filters: payload.filters || {},
        resultsCount:
          typeof payload.resultsCount === "number" ? payload.resultsCount : 0,
        matchedProductIds: payload.matchedProductIds || [],
        clickedProductId:
          payload.clickedProductId !== undefined &&
          payload.clickedProductId !== null
            ? String(payload.clickedProductId)
            : null,
        pageUrl: payload.pageUrl || req.originalUrl || null,
        referrer: payload.referrer || req.get("referer") || null,
        userAgent: payload.userAgent || req.get("user-agent") || null,
        metadata: payload.metadata || {},
        createdAt: new Date().toISOString(),
      };

      // Server-side dedupe safety net: if a very similar event was recorded recently, skip inserting.
      const isRecentDuplicate = await recentSimilarTrackingExists({
        sessionId: String(entry.sessionId),
        eventType: entry.eventType,
        searchTerm: entry.searchTerm ?? null,
        clickedProductId: entry.clickedProductId ?? null,
        resultsCount: Number(entry.resultsCount || 0),
        withinSeconds: 5,
      });

      if (isRecentDuplicate) {
        return res.status(200).json({ success: true });
      }

      const recorded = await recordProductSearchTrackingEvent({
        sessionId: String(entry.sessionId),
        userId: entry.userId ? String(entry.userId) : null,
        eventType: entry.eventType,
        searchTerm: entry.searchTerm,
        filters: entry.filters,
        resultsCount: Number(entry.resultsCount || 0),
        matchedProductIds: Array.isArray(entry.matchedProductIds)
          ? entry.matchedProductIds
          : [],
        clickedProductId: entry.clickedProductId,
        pageUrl: entry.pageUrl,
        referrer: entry.referrer,
        userAgent: entry.userAgent,
        metadata: entry.metadata,
      });

      const supabaseRecorded =
        recorded ||
        (await insertProductSearchTrackingEventToSupabase({
          sessionId: String(entry.sessionId),
          userId: entry.userId ? String(entry.userId) : null,
          eventType: entry.eventType,
          searchTerm: entry.searchTerm,
          filters: entry.filters,
          resultsCount: Number(entry.resultsCount || 0),
          matchedProductIds: Array.isArray(entry.matchedProductIds)
            ? entry.matchedProductIds
            : [],
          clickedProductId: entry.clickedProductId,
          pageUrl: entry.pageUrl,
          referrer: entry.referrer,
          userAgent: entry.userAgent,
          metadata: entry.metadata,
        }));

      if (!supabaseRecorded) {
        logger.warn("[Track] Direct insert did not complete");
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      logger.error({ data: [err] }, "[Track] Failed to record event:");
      return res.status(200).json({ success: true }); // Don't fail the user's request
    }
  });

  // Tickets API: create, list, update (uses Supabase REST API - same pattern as tracking)
  app.post("/api/tickets", async (req, res) => {
    try {
      const payload = req.body || {};
      let authenticatedUserId: string | null = null;
      let authenticatedUserEmail: string | null = null;
      let authenticatedUserName: string | null = null;

      // Try to get user from Authorization header (Supabase token)
      const authHeader = req.headers.authorization || "";
      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        try {
          const supabaseUrl =
            process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "") ||
            "https://dormxdlqbstebbsumdjj.supabase.co";
          const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

          if (supabaseAnonKey) {
            const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
              headers: {
                Authorization: `Bearer ${token}`,
                apikey: supabaseAnonKey,
              },
            });

            if (userRes.ok) {
              const userData = await userRes.json();
              authenticatedUserId = userData.id;
              authenticatedUserEmail = userData.email || null;
              authenticatedUserName =
                userData.user_metadata?.name || userData.email || null;
            }
          }
        } catch (tokenErr) {
          logger.warn(
            { data: [tokenErr] },
            "[Tickets] Failed to validate Bearer token:"
          );
        }
      }

      if (!authenticatedUserId) {
        return res
          .status(401)
          .json({ error: "Authentication required to create tickets" });
      }

      // Build ticket entry
      const entry: any = {
        referenceCode: sanitizeText(
          payload.referenceCode ||
            `T-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          64
        ),
        userId: authenticatedUserId,
        contactEmail:
          sanitizeEmail(
            payload.contactEmail || authenticatedUserEmail || "",
            255
          ) || null,
        contactPhone: sanitizePhone(payload.contactPhone || "", 24) || null,
        title: sanitizeText(payload.title || "", 255),
        description:
          sanitizeMultilineText(payload.description || "", 5000) || null,
        status: sanitizeText(payload.status || "open", 32),
        priority: sanitizeText(payload.priority || "medium", 32),
        channel: sanitizeText(payload.channel || "web", 32),
        assignedTo: payload.assignedTo ?? null,
        tags: payload.tags ?? [],
        attachments: payload.attachments ?? [],
        metadata: payload.metadata ?? {},
        createdAt: new Date().toISOString(),
      };

      // Use Supabase REST API - same pattern as tracking
      const supabaseUrl =
        process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "") ||
        "https://dormxdlqbstebbsumdjj.supabase.co";
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;

      if (!serviceKey) {
        logger.error("[Tickets] SUPABASE_SERVICE_KEY not configured");
        return res.status(500).json({ error: "Service key not configured" });
      }

      // Convert keys to lowercase to match PostgreSQL column names (same as tracking)
      const payloadForSupabase: Record<string, any> = {};
      Object.keys(entry || {}).forEach(k => {
        payloadForSupabase[String(k).toLowerCase()] = (entry as any)[k];
      });

      const ticketsUrl = `${supabaseUrl}/rest/v1/tickets`;

      const ticketRes = await fetch(ticketsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          Prefer: "return=representation",
        },
        body: JSON.stringify(payloadForSupabase),
      });

      const resText = await ticketRes.text();
      if (!ticketRes.ok) {
        logger.error(
          { data: [ticketRes.status, resText] },
          "[Tickets] Supabase API error:"
        );
        return res.status(502).json({ error: "Failed to create ticket" });
      }

      const created = JSON.parse(resText || "null");

      const recipientEmail = String(
        payload.contactEmail || authenticatedUserEmail || ""
      ).trim();
      const preferredEmailLanguage = resolvePreferredEmailLanguage(
        req,
        payload.language
      );
      let ticketEmailSent = false;
      if (recipientEmail) {
        const ticket = Array.isArray(created) ? created[0] : created;
        ticketEmailSent = await sendTicketConfirmationEmail(recipientEmail, {
          customer_name: sanitizeName(
            authenticatedUserName || payload.contactEmail || "Customer",
            100
          ),
          ticket_reference: String(
            ticket?.referencecode ||
              ticket?.referenceCode ||
              entry.referenceCode
          ),
          ticket_subject: String(
            ticket?.title || entry.title || "Support ticket"
          ),
          ticket_priority: String(
            ticket?.priority || entry.priority || "medium"
          ),
          ticket_status: String(ticket?.status || entry.status || "open"),
          ticket_created_at: String(
            ticket?.createdat || ticket?.createdAt || entry.createdAt
          ),
          ticket_description: String(
            ticket?.description || entry.description || ""
          ),
          contact_email: sanitizeEmail(
            payload.contactEmail || authenticatedUserEmail || "",
            255
          ),
          contact_phone: sanitizePhone(payload.contactPhone || "", 24),
          support_email:
            process.env.SMTP_FROM_EMAIL ||
            process.env.GMAIL_USER ||
            "support@motorvault.shop",
          language: preferredEmailLanguage,
        });

        if (!ticketEmailSent) {
          logger.warn("[Tickets] Ticket confirmation email was not sent");
        }
      }

      return res.status(201).json({
        success: true,
        emailSent: recipientEmail ? ticketEmailSent : false,
        ticket: Array.isArray(created) ? created[0] : created,
      });
    } catch (err) {
      logger.error({ data: [err] }, "[Tickets] create error:");
      return res.status(500).json({ error: "internal" });
    }
  });

  app.post("/api/contact-us", async (req, res) => {
    try {
      const payload = req.body || {};
      const name = sanitizeName(payload.name || "", 100);
      const email = sanitizeEmail(payload.email || "", 255);
      const location = sanitizeLocation(payload.location || "");
      const subject = sanitizeText(payload.subject || "", 200);
      const message = sanitizeMultilineText(payload.message || "", 5000);
      const honeypot = sanitizeText(payload.website || "", 120);
      const supportEmail =
        process.env.CONTACT_SUPPORT_EMAIL || "support@motorvault.shop";
      const preferredEmailLanguage = resolvePreferredEmailLanguage(
        req,
        payload.language
      );
      const validationErrorResponse = {
        success: false,
        error: "Validation error",
      };

      if (honeypot) {
        logger.warn(
          { data: [{ ip: req.ip }] },
          "[Contact] Honeypot submission blocked"
        );
        return res.status(400).json(validationErrorResponse);
      }

      if (!name || !email || !subject || !message) {
        logger.warn(
          {
            data: [
              {
                hasName: Boolean(name),
                hasEmail: Boolean(email),
                hasSubject: Boolean(subject),
                hasMessage: Boolean(message),
              },
            ],
          },
          "[Contact] Validation failed: missing required fields"
        );
        return res.status(400).json(validationErrorResponse);
      }

      if (!isValidEmailAddress(email)) {
        logger.warn(
          {
            data: [
              {
                email,
              },
            ],
          },
          "[Contact] Validation failed: invalid email format"
        );
        return res.status(400).json(validationErrorResponse);
      }

      if (message.length < 10) {
        logger.warn(
          {
            data: [
              {
                email,
              },
            ],
          },
          "[Contact] Validation failed: message too short"
        );
        return res.status(400).json(validationErrorResponse);
      }

      const captchaOk = await verifyRecaptchaToken(
        typeof payload.recaptchaToken === "string"
          ? payload.recaptchaToken
          : undefined,
        req.ip
      );
      if (!captchaOk) {
        return res.status(400).json(validationErrorResponse);
      }

      const supabaseUrl =
        process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "") ||
        "https://dormxdlqbstebbsumdjj.supabase.co";
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;

      const contactPayload = {
        name,
        email,
        location,
        subject,
        message,
      };

      let created: unknown = null;
      let stored = false;

      if (!serviceKey) {
        logger.warn(
          "[Contact] SUPABASE_SERVICE_KEY not configured; continuing with email-only processing"
        );
      } else {
        try {
          const contactRes = await fetch(`${supabaseUrl}/rest/v1/contactus`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey,
              Prefer: "return=representation",
            },
            body: JSON.stringify(contactPayload),
          });

          const resText = await contactRes.text();
          if (!contactRes.ok) {
            logger.error(
              { data: [contactRes.status, resText] },
              "[Contact] Supabase API error:"
            );
          } else {
            stored = true;
            created = JSON.parse(resText || "null");
          }
        } catch (storageError) {
          logger.error(
            { data: [storageError] },
            "[Contact] Supabase storage exception:"
          );
        }
      }

      // Send confirmation to user
      const contactEmailSent = await sendContactConfirmationEmail(email, {
        customer_name: name,
        contact_subject: subject || "General support request",
        contact_location: location,
        contact_message: message,
        support_email: supportEmail,
        language: preferredEmailLanguage,
      });

      const adminEmailSent = await sendContactAdminNotification(supportEmail, {
        name,
        email,
        location,
        subject,
        message,
      });

      if (!contactEmailSent) {
        logger.warn("[Contact] Confirmation email was not sent");
      }

      if (!adminEmailSent) {
        logger.error("[Contact] Support notification email was not sent");
        return res.status(502).json({
          success: false,
          error: "We were unable to send your message. Please try again.",
        });
      }

      return res.status(201).json({
        success: true,
      });
    } catch (err) {
      logger.error({ data: [err] }, "[Contact] create error:");
      return res.status(500).json({
        success: false,
        error: "We were unable to send your message. Please try again.",
      });
    }
  });

  app.get("/api/tickets", async (req, res) => {
    try {
      const { referenceCode } = req.query as Record<string, string>;
      let authenticatedUserId: string | null = null;

      // Validate Bearer token to get authenticated user
      const authHeader = req.headers.authorization || "";
      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        try {
          const supabaseUrl =
            process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "") ||
            "https://dormxdlqbstebbsumdjj.supabase.co";
          const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

          if (supabaseAnonKey) {
            const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
              headers: {
                Authorization: `Bearer ${token}`,
                apikey: supabaseAnonKey,
              },
            });

            if (userRes.ok) {
              const userData = await userRes.json();
              authenticatedUserId = userData.id;
            }
          }
        } catch (tokenErr) {
          logger.warn(
            { data: [tokenErr] },
            "[Tickets] Failed to validate Bearer token:"
          );
        }
      }

      if (!authenticatedUserId) {
        return res
          .status(401)
          .json({ error: "Authentication required to view tickets" });
      }

      const supabaseUrl =
        process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "") ||
        "https://dormxdlqbstebbsumdjj.supabase.co";
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;

      if (!serviceKey) {
        logger.error("[Tickets] SUPABASE_SERVICE_KEY not configured");
        return res.status(500).json({ error: "Service key not configured" });
      }

      // Always filter by authenticated user's ID - users can only see their own tickets
      let url = `${supabaseUrl}/rest/v1/tickets?select=*&userid=eq.${encodeURIComponent(authenticatedUserId)}`;
      if (referenceCode)
        url += `&referencecode=eq.${encodeURIComponent(referenceCode)}`;
      url += `&order=createdat.desc`;

      const ticketRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      });

      if (!ticketRes.ok) {
        const errText = await ticketRes.text();
        logger.error(
          { data: [ticketRes.status, errText] },
          "[Tickets] Supabase API error:"
        );
        return res.status(502).json({ error: "Failed to fetch tickets" });
      }

      const tickets = await ticketRes.json();
      return res.status(200).json(tickets || []);
    } catch (err) {
      logger.error({ data: [err] }, "[Tickets] list error:");
      return res.status(500).json({ error: "internal" });
    }
  });

  app.patch("/api/tickets/:referenceCode", async (req, res) => {
    try {
      const { referenceCode } = req.params as { referenceCode: string };
      const updates = req.body || {};

      const supabaseUrl =
        process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, "") ||
        "https://dormxdlqbstebbsumdjj.supabase.co";
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;

      if (!serviceKey) {
        logger.error("[Tickets] SUPABASE_SERVICE_KEY not configured");
        return res.status(500).json({ error: "Service key not configured" });
      }

      // Convert keys to lowercase for PostgreSQL column names
      const payloadForSupabase: Record<string, any> = {};
      Object.keys(updates || {}).forEach(k => {
        payloadForSupabase[String(k).toLowerCase()] = (updates as any)[k];
      });
      payloadForSupabase.updatedat = new Date().toISOString();

      const ticketsUrl = `${supabaseUrl}/rest/v1/tickets?referencecode=eq.${encodeURIComponent(referenceCode)}`;

      const ticketRes = await fetch(ticketsUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          Prefer: "return=representation",
        },
        body: JSON.stringify(payloadForSupabase),
      });

      if (!ticketRes.ok) {
        const errText = await ticketRes.text();
        logger.error(
          { data: [ticketRes.status, errText] },
          "[Tickets] Supabase API error:"
        );
        return res.status(502).json({ error: "Failed to update ticket" });
      }

      const updated = await ticketRes.json();
      return res.status(200).json({
        success: true,
        ticket: Array.isArray(updated) ? updated[0] : updated,
      });
    } catch (err) {
      logger.error({ data: [err] }, "[Tickets] update error:");
      return res.status(500).json({ error: "internal" });
    }
  });

  // Legacy: batch tracking endpoint (async import from db) - kept for backward compatibility
  import("../db")
    .then(() => {
      // Db is loaded but we're using REST API now
    })
    .catch(err => {
      logger.warn({ data: [err] }, "[App] Database connection setup skipped:");
    });
  app.get(
    ["/feed.xml", "/api/server"],
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (!isFeedRequest(req)) return next();

      try {
        const origin = getFeedOrigin(req);
        const lang = normalizeFeedLanguage(
          (req.query as Record<string, string>)?.lang
        );
        const currency = normalizeFeedCurrency(
          (req.query as Record<string, string>)?.curr ||
            (req.query as Record<string, string>)?.currency
        );
        const currencyRate = await getFeedCurrencyRate(currency);
        const products = await getFeedProducts();
        const channelCopy = getFeedChannelCopy(lang);
        const targetLanguageCode = mapFeedLanguageToTargetCode(lang);
        const feedTranslations =
          targetLanguageCode !== "en"
            ? await translateFeedTexts(
                targetLanguageCode,
                (products || []).flatMap(p => [
                  String(p.title || p.name || "").trim(),
                  buildFeedDescription(p),
                ])
              )
            : new Map<string, string>();
        const items = (products || [])
          .map(p => {
            const imageSource =
              p.cover_image_url ||
              p.image_url ||
              (Array.isArray(p.images) ? p.images[0] : null);
            const placeholder =
              "https://motorvault.shop/images/hero/premium-european-auto-parts-hero.webp";
            const image = resolveUrl(imageSource || placeholder, origin);
            const rawId =
              p.id ??
              p.uuid ??
              p.item_group_id ??
              p.sku ??
              p.part_number ??
              null;
            const id =
              rawId ??
              (p.title
                ? `GEN-${Buffer.from(String(p.title)).toString("base64").replace(/=+$/, "").slice(0, 12)}`
                : null);
            const title = String(p.title || p.name || "").trim();
            const titleCased = toTitleCase(title || "");
            const translatedTitle = feedTranslations.get(title) || title;
            const brand =
              String(p.brand || "MotorVault").trim() || "MotorVault";
            const description = buildFeedDescription(p);
            const translatedDescription =
              feedTranslations.get(description) || description;
            const priceAmount = Number(p.price);
            const convertedPriceAmount = Number.isFinite(priceAmount)
              ? convertUsdAmountWithRate(priceAmount, currencyRate)
              : NaN;
            const price = normalizePrice(convertedPriceAmount, currency);
            const fallbackProductPath = id ? `/product/${id}` : "";
            const link = resolveUrl(
              p.url || p.link || fallbackProductPath,
              origin
            );
            // Normalize condition to Facebook/Google accepted values: new, refurbished, used
            const rawCondition = String(p.condition || "")
              .trim()
              .toLowerCase();
            let condition = "new";
            if (!rawCondition) {
              condition = "new";
            } else if (rawCondition.includes("refurb")) {
              condition = "refurbished";
            } else if (
              rawCondition.includes("used") ||
              rawCondition.includes("like") ||
              rawCondition.includes("second")
            ) {
              condition = "used";
            } else if (rawCondition.includes("new")) {
              condition = "new";
            } else {
              condition = "used";
            }
            // Default to 'in stock' when availability is missing to satisfy feed requirements
            const availability =
              p.stock !== undefined
                ? Number(p.stock) > 0
                  ? "in stock"
                  : "out of stock"
                : "in stock";
            const quantity =
              p.stock !== undefined &&
              Number.isFinite(Number(p.stock)) &&
              Number(p.stock) >= 1
                ? Math.max(1, Math.floor(Number(p.stock)))
                : 1;
            // Only set googleProductCategory if it's not the default fallback
            const rawCategory = String(
              p.google_product_category || p.category_name || p.category || ""
            ).trim();
            const googleProductCategory =
              rawCategory || "Vehicles & Parts > Vehicle Parts & Accessories";
            const salePriceAmount = Number(p.sale_price);
            const salePrice = Number.isFinite(salePriceAmount)
              ? normalizePrice(
                  convertUsdAmountWithRate(salePriceAmount, currencyRate),
                  currency
                )
              : "";
            const itemGroupId = String(p.item_group_id || "").trim();
            const gtin = String(p.gtin || p.upc || p.ean || "").trim();
            const mpn = String(
              p.mpn || p.manufacturer_part_number || ""
            ).trim();
            const status = String(p.status || "active").trim() || "active";
            const color = String(p.color || "").trim();
            const size = String(p.size || "").trim();
            const ageGroup = String(p.age_group || "").trim();
            const gender = String(p.gender || "").trim();
            const shippingService =
              String(p.shipping_service || "Standard").trim() || "Standard";
            // Keep feed shipping in lockstep with website checkout/product shipping logic.
            const derivedShippingUsd = calculateShipping(Number(p.price || 0));
            const shippingPrice = normalizePrice(
              convertUsdAmountWithRate(derivedShippingUsd, currencyRate),
              currency
            );
            const customLabel0 = String(p.custom_label_0 || "").trim();

            if (!id || !title || !price || !link) {
              return "";
            }

            // Build core fields (always present)
            let itemXml = `<item>
<g:id>${escapeXml(id)}</g:id>
<g:title>${escapeXml(targetLanguageCode === "en" ? titleCased || title : translatedTitle)}</g:title>
<g:description>${escapeXml(targetLanguageCode === "en" ? description : translatedDescription)}</g:description>
<g:content_language>${escapeXml(lang)}</g:content_language>
<g:link>${escapeXml(link)}</g:link>
<g:image_link>${escapeXml(image)}</g:image_link>
<g:brand>${escapeXml(brand)}</g:brand>
<g:condition>${escapeXml(condition)}</g:condition>
<g:availability>${escapeXml(availability)}</g:availability>
<g:price>${escapeXml(price)}</g:price>`;

            // Add optional fields only if they have values
            if (salePrice)
              itemXml += `\n<g:sale_price>${escapeXml(salePrice)}</g:sale_price>`;

            // Add one shipping entry per supported country.
            if (shippingService && shippingPrice) {
              const shippingXml = FEED_SHIPPING_COUNTRIES.map(
                countryCode => `\n<g:shipping>
<g:country>${escapeXml(countryCode)}</g:country>
<g:service>${escapeXml(shippingService)}</g:service>
<g:price>${escapeXml(shippingPrice)}</g:price>
</g:shipping>`
              ).join("");
              itemXml += shippingXml;
            }

            itemXml += `\n<g:google_product_category>${escapeXml(googleProductCategory)}</g:google_product_category>`;
            if (customLabel0)
              itemXml += `\n<g:custom_label_0>${escapeXml(customLabel0)}</g:custom_label_0>`;
            if (gtin) itemXml += `\n<g:gtin>${escapeXml(gtin)}</g:gtin>`;
            if (mpn) itemXml += `\n<g:mpn>${escapeXml(mpn)}</g:mpn>`;
            if (itemGroupId)
              itemXml += `\n<g:item_group_id>${escapeXml(itemGroupId)}</g:item_group_id>`;
            if (color) itemXml += `\n<g:color>${escapeXml(color)}</g:color>`;
            if (size) itemXml += `\n<g:size>${escapeXml(size)}</g:size>`;
            if (ageGroup)
              itemXml += `\n<g:age_group>${escapeXml(ageGroup)}</g:age_group>`;
            if (gender)
              itemXml += `\n<g:gender>${escapeXml(gender)}</g:gender>`;
            itemXml += `\n</item>`;

            return itemXml;
          })
          .filter(Boolean)
          .join("\n");

        const xml = `<?xml version="1.0"?>\n<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n<channel>\n<title>${escapeXml(channelCopy.title)}</title>\n<link>${escapeXml(origin)}</link>\n<description>${escapeXml(channelCopy.description)}</description>\n${items}\n</channel>\n</rss>`;

        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");
        return res.status(200).send(xml);
      } catch (err) {
        logger.error({ data: [err] }, "[Feed] Error generating feed:");
        return res.status(500).send("Failed to generate feed");
      }
    }
  );

  return app;
}
