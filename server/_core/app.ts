import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from 'crypto';
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import { verifyTransaction, initializeTransaction } from "../paystack";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./env";
import { getDb, createOrder, createPayment } from "../db";

function getRequestOrigin(req: express.Request): string | null {
  const forwardedProto = req.header('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.header('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.header('host');

  if (!protocol || !host) return null;
  return `${protocol}://${host}`;
}

function isValidConfiguredOrigin(value: string | undefined): boolean {
  if (!value) return false;

  const normalized = value.trim().replace(/\/$/, '');
  if (!normalized || normalized.includes('your-production-domain.com')) {
    return false;
  }

  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getFeedOrigin(req: express.Request): string {
  const preferredFeedOrigin = 'https://store-nine-eosin.vercel.app';
  if (isValidConfiguredOrigin(preferredFeedOrigin)) {
    return preferredFeedOrigin.replace(/\/$/, '');
  }

  const configuredOrigin = ENV.siteUrl?.trim();
  if (isValidConfiguredOrigin(configuredOrigin)) {
    return configuredOrigin.replace(/\/$/, '');
  }

  return (getRequestOrigin(req) || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
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
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&apos;',
    '"': '&quot;',
  }[character] || character));
}

function resolveUrl(value: unknown, origin: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return raw.startsWith('/') ? `${origin}${raw}` : `${origin}/${raw}`;
}

function toTitleCase(input: string): string {
  return String(input || '')
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .trim();
}

function normalizePrice(value: unknown, currency: string = 'USD'): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return `${amount.toFixed(2)} ${currency}`;
}

function formatLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stringifySpecificValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) {
    const joined = value
      .map((entry) => String(entry ?? '').trim())
      .filter(Boolean)
      .join(', ');
    return joined;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value).trim();
}

function parseLooseSpecificsText(rawValue: string): Record<string, string> {
  const normalized = rawValue
    .replace(/[{}]/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[\t]+/g, ' ')
    .replace(/\s*\|\s*/g, '\n')
    .replace(/\s*;\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  if (!normalized) return {};

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: Record<string, string> = {};
  let detailIndex = 1;

  for (const line of lines) {
    const segment = line.replace(/^[-*+•]\s*/, '').trim();
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

function parseItemSpecifics(value: FeedProduct['item_specifics']): Record<string, unknown> {
  if (!value) return {};

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return {};
  }

  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to tolerant text parsing.
  }

  const normalizedJsonLike = trimmed
    .replace(/([{,]\s*)([A-Za-z0-9_\-\s]+)\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"')
    .replace(/,\s*}/g, '}');

  try {
    const parsed = JSON.parse(normalizedJsonLike);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
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
        .replace(/\s+/g, ' ')
        .replace(/\s+,/g, ',')
        .trim();
      if (!rendered) return '';
      return `${formatLabel(key)}: ${rendered}`;
    })
    .filter(Boolean);

  if (specificsLines.length === 0) {
    return 'Item specifics not provided';
  }

  return specificsLines.join('\n').slice(0, 5000);
}

function getAppleMerchantAssociationPath(): string {
  return path.resolve(process.cwd(), "server/_core/apple-developer-merchantid-domain-association");
}

function getOriginalPath(req: express.Request): string {
  return req.header('x-original-url') || req.header('x-forwarded-url') || req.path || '';
}

async function getFeedProducts(): Promise<FeedProduct[]> {
  if (!ENV.supabaseUrl) {
    console.warn('[Feed] Supabase URL is not configured');
    return [];
  }

  const supabase = createClient(
    ENV.supabaseUrl,
    ENV.supabaseServiceKey || ENV.supabaseAnonKey || ''
  );

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.warn('[Feed] Supabase product lookup failed:', error.message);
      return [];
    }

    return Array.isArray(data) ? (data as FeedProduct[]) : [];
  } catch (error) {
    console.warn('[Feed] Supabase feed lookup failed:', error);
    return [];
  }
}

export function createApp() {
  const app = express();

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.use((req, res, next) => {
    const originalPath = getOriginalPath(req);

    if (originalPath === '/.well-known/apple-developer-merchantid-domain-association') {
      const associationPath = getAppleMerchantAssociationPath();

      try {
        const association = fs.readFileSync(associationPath, 'utf-8');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(association);
      } catch (error) {
        console.error('[Apple Merchant] Failed to read association file:', error);
        return res.status(500).send('Failed to load association file');
      }
    }

    if (originalPath === '/feed.xml') {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }

    return next();
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Dev-only debug endpoint to inspect session cookie and verification.
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug/session', async (req, res) => {
      try {
        const cookieHeader = req.headers.cookie ?? null;
        const parsed = cookieHeader ? parseCookieHeader(cookieHeader) : {};
        const sessionCookie = parsed[COOKIE_NAME];
        const verified = await sdk.verifySession(sessionCookie ?? null);
        return res.json({
          cookieHeader,
          parsedCookies: parsed,
          sessionCookie: Boolean(sessionCookie),
          verifiedSession: verified,
        });
      } catch (err) {
        console.error('[Debug] /api/debug/session error', err);
        return res.status(500).json({ error: 'debug endpoint failed' });
      }
    });
  }

  // Paystack redirect callback: verify reference and create order for authenticated user
  app.get('/payment/callback', async (req: express.Request, res: express.Response) => {
    const reference = String(req.query.reference ?? req.query.reference ?? '');
    if (!reference) {
      return res.status(400).send('Missing reference');
    }

    try {
      const verification = await verifyTransaction(reference);

      if (!verification || !verification.data) {
        console.error('[Paystack] Empty verification response for', reference);
        return res.status(502).send('Failed to verify transaction');
      }

      const status = (verification.data as any).status;
      if (status !== 'success') {
        console.warn('[Paystack] Transaction not successful:', reference, status);
        return res.redirect(`/checkout?payment=failed&reference=${encodeURIComponent(reference)}`);
      }

      // Try to authenticate the user via SDK session cookie
      let userId: number | null = null;
      try {
        const user = await sdk.authenticateRequest(req as any);
        if (user && (user as any).id) userId = (user as any).id;
      } catch (authErr) {
        console.warn('[Payment Callback] User not authenticated via SDK session');
      }

      if (!userId) {
        console.error('[Payment Callback] Cannot create order without authenticated user');
        return res.redirect(`/checkout?payment=needs_auth&reference=${encodeURIComponent(reference)}`);
      }

      const paystackData = verification.data as any;
      const amountCents = paystackData.amount as number;
      const totalAmount = Number((amountCents / 100).toFixed(2));

      let paymentId: string | null = null;
      let orderId: number | null = null;

      // STEP 1: Record payment details FIRST
      try {
        const paymentRecord = await createPayment(0, userId, {
          provider: 'paystack',
          reference: paystackData.reference,
          amount: totalAmount as any,
          currency: paystackData.currency || 'USD',
          status: paystackData.status,
          channel: paystackData.channel || 'card',
          gatewayResponse: paystackData.gateway_response,
          authorizationCode: paystackData.authorization?.authorization_code,
          cardBin: paystackData.authorization?.bin,
          cardLast4: paystackData.authorization?.last4,
          cardBrand: paystackData.authorization?.brand,
          bank: paystackData.authorization?.bank,
          ipAddress: paystackData.ip_address,
          metadata: paystackData.metadata ? JSON.stringify(paystackData.metadata) : null,
          fees: (paystackData.fees ? Number(paystackData.fees) / 100 : 0) as any,
          paidAt: paystackData.paid_at ? new Date(paystackData.paid_at) : null,
        });

      } catch (paymentErr) {
        console.error('[Payment Callback] Failed to record payment:', paymentErr);
        return res.status(500).send('Payment verified but failed to record payment details');
      }

      // STEP 2: Create order AFTER payment is recorded
      try {
        const orderNumber = `PKS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        const result = await createOrder(userId, {
          orderNumber,
          status: 'confirmed',
          subtotal: String(totalAmount),
          shippingCost: '0',
          tax: '0',
          total: String(totalAmount),
          paymentMethod: 'paystack',
          paystackPaymentId: paystackData.reference,
          shippingAddress: null,
          billingAddress: null,
          trackingNumber: null,
        });

      } catch (orderErr) {
        console.error('[Payment Callback] Failed to create order:', orderErr);
        return res.status(500).send('Payment recorded but failed to create order');
      }

      // Redirect to a success page (client can show order details by reference)
      return res.redirect(`/checkout?payment=success&reference=${encodeURIComponent(reference)}`);
    } catch (err) {
      console.error('[Payment Callback] Verification error:', err);
      return res.status(500).send('Payment verification failed');
    }
  });

  // POST /initialize-payment - simple Express endpoint for initializing Paystack transactions
  app.post('/initialize-payment', async (req: express.Request, res: express.Response) => {
    const { email, amount } = req.body ?? {};

    if (!email || !amount) {
      return res.status(400).json({ error: 'Missing email or amount in request body' });
    }

    try {
      const requestOrigin = getRequestOrigin(req);
      // initializeTransaction expects amount in base units (e.g., 500 for 500.00), it will convert to kobo
      const paymentData = await initializeTransaction({
        email: String(email),
        amount: Number(amount),
        callback_url: process.env.PAYSTACK_CALLBACK_URL || (requestOrigin ? `${requestOrigin}/payment/callback` : undefined),
      });

      return res.status(200).json(paymentData);
    } catch (error: any) {
      console.error('[Initialize Payment] Error initializing transaction:', error?.message ?? error);
      return res.status(500).json({ error: error?.message ?? 'Failed to initialize payment' });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Simple tracking endpoint used by frontend to record searches and clicks
  // Tracking endpoint using Supabase REST API (no direct DB connection needed)
  app.post('/api/track', async (req, res) => {
    try {
      const payload = req.body || {};

      // Normalize payload fields
      const entry: any = {
        sessionId: String(payload.sessionId || '') || (req.headers['x-session-id'] || ''),
        userId: payload.userId || null,
        eventType: String(payload.eventType || 'search'),
        searchTerm: payload.searchTerm || null,
        filters: payload.filters || {},
        resultsCount: typeof payload.resultsCount === 'number' ? payload.resultsCount : 0,
        matchedProductIds: payload.matchedProductIds || [],
        clickedProductId: (payload.clickedProductId && typeof payload.clickedProductId === 'string') ? payload.clickedProductId : null,
        pageUrl: payload.pageUrl || req.originalUrl || null,
        referrer: payload.referrer || req.get('referer') || null,
        userAgent: payload.userAgent || req.get('user-agent') || null,
        metadata: payload.metadata || {},
        createdAt: new Date().toISOString(),
      };

      // Try to insert via Supabase REST API
      const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '') || 'https://dormxdlqbstebbsumdjj.supabase.co';
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;

      if (!serviceKey) {
        console.warn('[Track] SUPABASE_SERVICE_KEY not configured, tracking skipped');
        return res.status(200).json({ success: true }); // Don't fail the user's request
      }

      const trackingUrl = `${supabaseUrl}/rest/v1/product_search_tracking`;

      // Supabase/PostgREST maps JSON keys to PostgreSQL column names which
      // are lowercased when created without quotes. Convert keys to
      // lowercase to match the existing table column names (e.g. "clickedProductId" -> "clickedproductid").
      const payloadForSupabase: Record<string, any> = {};
      Object.keys(entry || {}).forEach((k) => {
        payloadForSupabase[String(k).toLowerCase()] = (entry as any)[k];
      });

      const trackRes = await fetch(trackingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(payloadForSupabase),
      });

      if (!trackRes.ok) {
        const errText = await trackRes.text();
        console.error('[Track] Supabase API error:', trackRes.status, errText);
        return res.status(200).json({ success: true }); // Don't fail the user's request
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[Track] Failed to record event:', err);
      return res.status(200).json({ success: true }); // Don't fail the user's request
    }
  });

  // Tickets API: create, list, update (uses Supabase REST API - same pattern as tracking)
  app.post('/api/tickets', async (req, res) => {
    try {
      const payload = req.body || {};
      let authenticatedUserId: string | null = null;

      // Try to get user from Authorization header (Supabase token)
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '') || 'https://dormxdlqbstebbsumdjj.supabase.co';
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
          console.warn('[Tickets] Failed to validate Bearer token:', tokenErr);
        }
      }

      if (!authenticatedUserId) {
        return res.status(401).json({ error: 'Authentication required to create tickets' });
      }

      // Build ticket entry
      const entry: any = {
        referenceCode: String(payload.referenceCode || `T-${Date.now()}-${Math.random().toString(36).slice(2,6)}`),
        userId: authenticatedUserId,
        contactEmail: payload.contactEmail ?? null,
        contactPhone: payload.contactPhone ?? null,
        title: String(payload.title || '').slice(0, 255),
        description: payload.description ?? null,
        status: String(payload.status || 'open'),
        priority: String(payload.priority || 'medium'),
        channel: payload.channel ?? 'web',
        assignedTo: payload.assignedTo ?? null,
        tags: payload.tags ?? [],
        attachments: payload.attachments ?? [],
        metadata: payload.metadata ?? {},
        createdAt: new Date().toISOString(),
      };

      // Use Supabase REST API - same pattern as tracking
      const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '') || 'https://dormxdlqbstebbsumdjj.supabase.co';
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;

      if (!serviceKey) {
        console.error('[Tickets] SUPABASE_SERVICE_KEY not configured');
        return res.status(500).json({ error: 'Service key not configured' });
      }

      // Convert keys to lowercase to match PostgreSQL column names (same as tracking)
      const payloadForSupabase: Record<string, any> = {};
      Object.keys(entry || {}).forEach((k) => {
        payloadForSupabase[String(k).toLowerCase()] = (entry as any)[k];
      });

      const ticketsUrl = `${supabaseUrl}/rest/v1/tickets`;

      const ticketRes = await fetch(ticketsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(payloadForSupabase),
      });

      const resText = await ticketRes.text();
      if (!ticketRes.ok) {
        console.error('[Tickets] Supabase API error:', ticketRes.status, resText);
        return res.status(502).json({ error: 'Failed to create ticket' });
      }

      const created = JSON.parse(resText || 'null');
      return res.status(201).json({ success: true, ticket: Array.isArray(created) ? created[0] : created });
    } catch (err) {
      console.error('[Tickets] create error:', err);
      return res.status(500).json({ error: 'internal' });
    }
  });

  app.get('/api/tickets', async (req, res) => {
    try {
      const { referenceCode } = req.query as Record<string, string>;
      let authenticatedUserId: string | null = null;

      // Validate Bearer token to get authenticated user
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '') || 'https://dormxdlqbstebbsumdjj.supabase.co';
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
          console.warn('[Tickets] Failed to validate Bearer token:', tokenErr);
        }
      }

      if (!authenticatedUserId) {
        return res.status(401).json({ error: 'Authentication required to view tickets' });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '') || 'https://dormxdlqbstebbsumdjj.supabase.co';
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;

      if (!serviceKey) {
        console.error('[Tickets] SUPABASE_SERVICE_KEY not configured');
        return res.status(500).json({ error: 'Service key not configured' });
      }

      // Always filter by authenticated user's ID - users can only see their own tickets
      let url = `${supabaseUrl}/rest/v1/tickets?select=*&userid=eq.${encodeURIComponent(authenticatedUserId)}`;
      if (referenceCode) url += `&referencecode=eq.${encodeURIComponent(referenceCode)}`;
      url += `&order=createdat.desc`;

      const ticketRes = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
      });

      if (!ticketRes.ok) {
        const errText = await ticketRes.text();
        console.error('[Tickets] Supabase API error:', ticketRes.status, errText);
        return res.status(502).json({ error: 'Failed to fetch tickets' });
      }

      const tickets = await ticketRes.json();
      return res.status(200).json(tickets || []);
    } catch (err) {
      console.error('[Tickets] list error:', err);
      return res.status(500).json({ error: 'internal' });
    }
  });

  app.patch('/api/tickets/:referenceCode', async (req, res) => {
    try {
      const { referenceCode } = req.params as { referenceCode: string };
      const updates = req.body || {};

      const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '') || 'https://dormxdlqbstebbsumdjj.supabase.co';
      const serviceKey = process.env.SUPABASE_SERVICE_KEY;

      if (!serviceKey) {
        console.error('[Tickets] SUPABASE_SERVICE_KEY not configured');
        return res.status(500).json({ error: 'Service key not configured' });
      }

      // Convert keys to lowercase for PostgreSQL column names
      const payloadForSupabase: Record<string, any> = {};
      Object.keys(updates || {}).forEach((k) => {
        payloadForSupabase[String(k).toLowerCase()] = (updates as any)[k];
      });
      payloadForSupabase.updatedat = new Date().toISOString();

      const ticketsUrl = `${supabaseUrl}/rest/v1/tickets?referencecode=eq.${encodeURIComponent(referenceCode)}`;

      const ticketRes = await fetch(ticketsUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(payloadForSupabase),
      });

      if (!ticketRes.ok) {
        const errText = await ticketRes.text();
        console.error('[Tickets] Supabase API error:', ticketRes.status, errText);
        return res.status(502).json({ error: 'Failed to update ticket' });
      }

      const updated = await ticketRes.json();
      return res.status(200).json({ success: true, ticket: Array.isArray(updated) ? updated[0] : updated });
    } catch (err) {
      console.error('[Tickets] update error:', err);
      return res.status(500).json({ error: 'internal' });
    }
  });

  // Legacy: batch tracking endpoint (async import from db) - kept for backward compatibility
  import('../db')
    .then(() => {
      // Db is loaded but we're using REST API now
    })
    .catch((err) => {
      console.warn('[App] Database connection setup skipped:', err);
    });
      app.get(['/feed.xml', '/api/server'], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const originalPath = getOriginalPath(req);
        if (originalPath !== '/feed.xml') return next();

        try {
          const origin = getFeedOrigin(req);
          const products = await getFeedProducts();
          const items = (products || []).map((p) => {
            const imageSource = p.cover_image_url || p.image_url || (Array.isArray(p.images) ? p.images[0] : null);
            const placeholder = 'https://store-nine-eosin.vercel.app/images/placeholder.png';
            const image = resolveUrl(imageSource || placeholder, origin);
            const rawId = p.id ?? p.uuid ?? p.item_group_id ?? p.sku ?? p.part_number ?? null;
            const id = rawId ?? (p.title ? `GEN-${Buffer.from(String(p.title)).toString('base64').replace(/=+$/,'').slice(0,12)}` : null);
            const title = String(p.title || p.name || '').trim();
            const titleCased = toTitleCase(title || '');
            const brand = String(p.brand || 'MotorVault').trim() || 'MotorVault';
            const description = buildFeedDescription(p);
            const price = normalizePrice(p.price);
            const fallbackProductPath = id ? `/product/${id}` : '';
            const link = resolveUrl(p.url || p.link || fallbackProductPath, origin);
            // Normalize condition to Facebook/Google accepted values: new, refurbished, used
            const rawCondition = String(p.condition || '').trim().toLowerCase();
            let condition = 'new';
            if (!rawCondition) {
              condition = 'new';
            } else if (rawCondition.includes('refurb')) {
              condition = 'refurbished';
            } else if (rawCondition.includes('used') || rawCondition.includes('like') || rawCondition.includes('second')) {
              condition = 'used';
            } else if (rawCondition.includes('new')) {
              condition = 'new';
            } else {
              condition = 'used';
            }
            // Default to 'in stock' when availability is missing to satisfy feed requirements
            const availability = (p.stock !== undefined)
              ? (Number(p.stock) > 0 ? 'in stock' : 'out of stock')
              : 'in stock';
            const quantity = (p.stock !== undefined && Number.isFinite(Number(p.stock)) && Number(p.stock) >= 1)
              ? Math.max(1, Math.floor(Number(p.stock)))
              : 1;
            // Only set googleProductCategory if it's not the default fallback
            const rawCategory = String(p.google_product_category || p.category_name || p.category || '').trim();
            const googleProductCategory = rawCategory || 'Vehicles & Parts > Vehicle Parts & Accessories';
            const salePrice = normalizePrice(p.sale_price);
            const itemGroupId = String(p.item_group_id || '').trim();
            const gtin = String(p.gtin || p.upc || p.ean || '').trim();
            const mpn = String(p.mpn || p.manufacturer_part_number || '').trim();
            const status = String(p.status || 'active').trim() || 'active';
            const color = String(p.color || '').trim();
            const size = String(p.size || '').trim();
            const ageGroup = String(p.age_group || '').trim();
            const gender = String(p.gender || '').trim();
            const shippingCountry = String(p.shipping_country || '').trim();
            const shippingService = String(p.shipping_service || '').trim();
            const shippingPrice = normalizePrice(p.shipping_price);
            const customLabel0 = String(p.custom_label_0 || '').trim();

            if (!id || !title || !price || !link) {
              return '';
            }
            
            // Build core fields (always present)
            let itemXml = `<item>
<g:id>${escapeXml(id)}</g:id>
<g:title>${escapeXml(titleCased || title)}</g:title>
<g:description>${escapeXml(description)}</g:description>
<g:link>${escapeXml(link)}</g:link>
<g:image_link>${escapeXml(image)}</g:image_link>
<g:brand>${escapeXml(brand)}</g:brand>
<g:condition>${escapeXml(condition)}</g:condition>
<g:availability>${escapeXml(availability)}</g:availability>
<g:price>${escapeXml(price)}</g:price>`;

            // Add optional fields only if they have values
            if (salePrice) itemXml += `\n<g:sale_price>${escapeXml(salePrice)}</g:sale_price>`;
            
            // Add shipping if all required fields present
            if (shippingCountry && shippingService && shippingPrice) {
              itemXml += `\n<g:shipping>
<g:country>${escapeXml(shippingCountry)}</g:country>
<g:service>${escapeXml(shippingService)}</g:service>
<g:price>${escapeXml(shippingPrice)}</g:price>
</g:shipping>`;
            }
            
            itemXml += `\n<g:google_product_category>${escapeXml(googleProductCategory)}</g:google_product_category>`;
            if (customLabel0) itemXml += `\n<g:custom_label_0>${escapeXml(customLabel0)}</g:custom_label_0>`;
            if (gtin) itemXml += `\n<g:gtin>${escapeXml(gtin)}</g:gtin>`;
            if (mpn) itemXml += `\n<g:mpn>${escapeXml(mpn)}</g:mpn>`;
            if (itemGroupId) itemXml += `\n<g:item_group_id>${escapeXml(itemGroupId)}</g:item_group_id>`;
            if (color) itemXml += `\n<g:color>${escapeXml(color)}</g:color>`;
            if (size) itemXml += `\n<g:size>${escapeXml(size)}</g:size>`;
            if (ageGroup) itemXml += `\n<g:age_group>${escapeXml(ageGroup)}</g:age_group>`;
            if (gender) itemXml += `\n<g:gender>${escapeXml(gender)}</g:gender>`;
            itemXml += `\n</item>`;
            
            return itemXml;
          })
          .filter(Boolean)
          .join('\n');

      const xml = `<?xml version="1.0"?>\n<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n<channel>\n<title>MotorVault</title>\n<link>${escapeXml(origin)}</link>\n<description>Product catalog for Facebook Ads and sales</description>\n${items}\n</channel>\n</rss>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      return res.status(200).send(xml);
    } catch (err) {
      console.error('[Feed] Error generating feed:', err);
      return res.status(500).send('Failed to generate feed');
    }
  });

  return app;
}