import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import { verifyTransaction, initializeTransaction } from "../paystack";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getRequestOrigin(req: express.Request): string | null {
  const forwardedProto = req.header('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.header('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.header('host');

  if (!protocol || !host) return null;
  return `${protocol}://${host}`;
}

const supabaseAdmin = ENV.supabaseUrl && (ENV.supabaseServiceKey || ENV.supabaseAnonKey)
  ? createSupabaseClient(ENV.supabaseUrl, ENV.supabaseServiceKey || ENV.supabaseAnonKey || '')
  : null;

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
        console.warn('[Payment Callback] User not authenticated via SDK session, skipping order creation');
      }

      // Insert order into Supabase orders table (user_id optional)
      try {
        const amountKobo = (verification.data as any).amount as number;
        const totalAmount = (amountKobo / 100).toFixed(2);
        const orderRow: any = {
          user_id: null,
          total_amount: totalAmount,
          currency: (verification.data as any).currency || 'USD',
          status: 'confirmed',
          created_at: new Date().toISOString(),
        };

        // If SDK-authenticated user exists, attempt to map to a Supabase profile id
        if (userId && supabaseAdmin) {
          // The SDK user id may not match Supabase profile id; try to find a profile by email from verification
          const email = (verification.data as any).customer?.email;
          if (email) {
            const { data: profiles } = await supabaseAdmin.from('profiles').select('id').eq('email', email).limit(1);
            if (profiles && (profiles as any).length > 0) {
              orderRow.user_id = (profiles as any)[0].id;
            }
          }
        }

        if (supabaseAdmin) {
          // Insert order and return its id
          const { data: insertedOrders, error: insertErr } = await supabaseAdmin
            .from('orders')
            .insert(orderRow)
            .select('id')
            .maybeSingle();

          if (insertErr) {
            console.error('[Payment Callback] Failed to insert order into Supabase:', insertErr.message);
            return res.status(500).send('Payment verified but failed to record order');
          }

          const orderId = insertedOrders?.id;

          // If we could resolve a profile user, read their cart and persist order_items
          if (orderRow.user_id && orderId) {
            try {
              const { data: cartItems, error: cartErr } = await supabaseAdmin
                .from('cart_items')
                .select('id, product_id, quantity, product:products(*)')
                .eq('user_id', orderRow.user_id);

              if (cartErr) {
                console.warn('[Payment Callback] Failed to fetch cart items:', cartErr.message);
              } else if (Array.isArray(cartItems) && cartItems.length > 0) {
                const itemsToInsert = (cartItems as any[]).map((ci) => ({
                  order_id: orderId,
                  product_id: ci.product_id,
                  quantity: ci.quantity || 1,
                  price: String((ci.product && ci.product.price) ?? 0),
                  created_at: new Date().toISOString(),
                }));

                const { error: oiErr } = await supabaseAdmin.from('order_items').insert(itemsToInsert);
                if (oiErr) {
                  console.error('[Payment Callback] Failed to insert order_items:', oiErr.message);
                } else {
                  // Clear user's cart
                  const { error: clearErr } = await supabaseAdmin.from('cart_items').delete().eq('user_id', orderRow.user_id);
                  if (clearErr) {
                    console.warn('[Payment Callback] Failed to clear cart for user:', clearErr.message);
                  }
                }
              }
            } catch (cartErr) {
              console.error('[Payment Callback] Error persisting order items:', cartErr);
            }
          }
        } else {
          console.warn('[Payment Callback] Supabase admin client not configured; skipping order insert');
        }
      } catch (dbErr) {
        console.error('[Payment Callback] Failed to create order in Supabase:', dbErr);
        return res.status(500).send('Payment verified but failed to create order');
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