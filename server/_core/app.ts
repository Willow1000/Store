import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import { verifyTransaction, initializeTransaction } from "../paystack";
import { sdk } from "./sdk";
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
  const configuredOrigin = ENV.siteUrl?.trim();
  if (isValidConfiguredOrigin(configuredOrigin)) {
    return configuredOrigin.replace(/\/$/, '');
  }

  return (getRequestOrigin(req) || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

type FeedProduct = {
  id?: string | number;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  short_description?: string | null;
  price?: string | number | null;
  stock?: string | number | null;
  url?: string | null;
  cover_image_url?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  images?: unknown;
  condition?: string | null;
  brand?: string | null;
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

function normalizePrice(value: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return `${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)} USD`;
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
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.status(200).send(Buffer.from(association, 'hex'));
      } catch (error) {
        console.error('[Apple Merchant] Failed to read association file:', error);
        return res.status(500).send('Failed to load association file');
      }
    }

    if (originalPath === '/feed.xml') {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    return next();
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

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

  // Product feed for external crawlers (e.g., Facebook/Commerce Manager)
  app.get(['/feed.xml', '/api/server'], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const originalPath = getOriginalPath(req);
    if (originalPath !== '/feed.xml') {
      return next();
    }

    try {
      const origin = getFeedOrigin(req);
      const products = await getFeedProducts();

      const items = products
        .map((p: FeedProduct) => {
          const id = String(p.id ?? '').trim();
          const title = String(p.title || p.name || '').trim();
          const description = String(p.description || p.short_description || title).trim();
          const price = normalizePrice(p.price);
          const link = resolveUrl(`/product/${id}`, origin);
          const imageSource = p.cover_image_url || p.image_url || (Array.isArray(p.images) ? p.images[0] : null);
          const image = resolveUrl(imageSource || '/images/placeholder.png', origin);
          const condition = String(p.condition || 'new').trim() || 'new';
          const brand = String(p.brand || '').trim();
          const availability = (p.stock !== undefined && Number(p.stock) > 0) ? 'in stock' : 'out of stock';

          if (!id || !title || !price || !link) {
            return '';
          }

          return `    <item>
      <g:id>${escapeXml(id)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:availability>${escapeXml(availability)}</g:availability>
      <g:condition>${escapeXml(condition)}</g:condition>
      <g:price>${escapeXml(price)}</g:price>
      ${brand ? `<g:brand>${escapeXml(brand)}</g:brand>` : ''}
    </item>`;
        })
        .filter(Boolean)
        .join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n    <title>MotorVault Product Feed</title>\n    <link>${escapeXml(origin)}</link>\n    <description>MotorVault product catalog feed</description>\n${items}\n  </channel>\n</rss>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.status(200).send(xml);
    } catch (err) {
      console.error('[Feed] Error generating feed:', err);
      return res.status(500).send('Failed to generate feed');
    }
  });

  return app;
}