import express, { type Express } from "express";
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

export function createApp() {
  const app = express();

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

        console.log('[Payment Callback] Payment recorded successfully:', { 
          reference: paystackData.reference, 
          provider: 'paystack', 
          status: paystackData.status,
          amount: totalAmount 
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

        console.log('[Payment Callback] Order created successfully:', { 
          userId, 
          orderNumber, 
          totalAmount, 
          reference: paystackData.reference
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

  return app;
}