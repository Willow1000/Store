import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getProducts, getProductById, getFeaturedProducts, getUserCart, addToCart, getUserOrders, createOrder, getCategories, createNotification, getUserNotifications, getUserWishlist, addToWishlist, removeFromWishlist, upsertUser } from "./db";
import { createBankTransferCharge, createPaystackOrder, fetchPaystackOrder, fetchPaystackProductOrders, listPaystackOrders, validatePaystackOrder, verifyTransaction, initializeTransaction, chargeAuthorization, checkAuthorization, requestReauthorization, viewTransactionTimeline, getTransactionTotals, exportTransactions, fetchTransaction } from "./paystack";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      // clearCookie will automatically expire the cookie, no maxAge needed
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return {
        success: true,
      } as const;
    }),
    syncOAuthUser: publicProcedure
      .input(z.object({
        id: z.string(),
        email: z.string().optional(),
        name: z.string().optional(),
        loginMethod: z.enum(['google', 'github', 'apple', 'microsoft', 'email']).default('google'),
      }))
      .mutation(async ({ input }) => {
        try {
          await upsertUser({
            openId: input.id,
            email: input.email,
            name: input.name,
            loginMethod: input.loginMethod,
            lastSignedIn: new Date(),
          });
          return { success: true };
        } catch (error) {
          console.error('[tRPC] syncOAuthUser error:', error);
          throw error;
        }
      }),
  }),

  // Product procedures
  products: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getProducts(input.limit, input.offset)),
    
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getProductById(input)),
    
    featured: publicProcedure
      .input(z.object({ limit: z.number().default(8) }))
      .query(({ input }) => getFeaturedProducts(input.limit)),
  }),

  // Category procedures
  categories: router({
    list: publicProcedure.query(() => getCategories()),
  }),

  // Cart procedures
  cart: router({
    getCart: protectedProcedure.query(({ ctx }) => getUserCart(ctx.user.id)),
    
    addItem: protectedProcedure
      .input(z.object({ productId: z.number(), variantId: z.number().optional(), quantity: z.number().default(1) }))
      .mutation(({ ctx, input }) => addToCart(ctx.user.id, input.productId, input.variantId, input.quantity)),
  }),

  // Wishlist procedures
  wishlist: router({
    getWishlist: protectedProcedure.query(({ ctx }) => getUserWishlist(ctx.user.id)),
    
    addItem: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(({ ctx, input }) => addToWishlist(ctx.user.id, input.productId)),
    
    removeItem: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .mutation(({ ctx, input }) => removeFromWishlist(ctx.user.id, input.productId)),
  }),

  // Order procedures
  orders: router({
    list: protectedProcedure.query(({ ctx }) => getUserOrders(ctx.user.id)),
    
    create: protectedProcedure
      .input(z.object({
        orderNumber: z.string(),
        subtotal: z.string(),
        shippingCost: z.string().optional(),
        tax: z.string().optional(),
        total: z.string(),
        shippingAddress: z.record(z.string(), z.unknown()),
        billingAddress: z.record(z.string(), z.unknown()).optional(),
        paymentMethod: z.string(),
        stripePaymentIntentId: z.string().optional(),
        paystackPaymentId: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => createOrder(ctx.user.id, input as any))
  }),

  // Paystack procedures
  paystack: router({
    transactions: router({
      initialize: protectedProcedure
        .input(z.object({
          email: z.string().email(),
          amount: z.number().int().positive(),
          reference: z.string().optional(),
          currency: z.string().optional(),
          description: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
          plan: z.string().optional(),
          subaccount: z.string().optional(),
          transaction_charge: z.number().optional(),
          bearer: z.enum(['account', 'subaccount']).optional(),
          invoice_limit: z.number().int().optional(),
        }))
        .mutation(({ input }) => initializeTransaction(input)),
      verify: protectedProcedure
        .input(z.string().min(1))
        .query(({ input }) => verifyTransaction(input)),
      fetch: protectedProcedure
        .input(z.number().int().positive())
        .query(({ input }) => fetchTransaction(input)),
      timeline: protectedProcedure
        .input(z.union([z.string(), z.number().int().positive()]))
        .query(({ input }) => viewTransactionTimeline(input)),
      totals: protectedProcedure
        .input(z.object({
          from: z.string().optional(),
          to: z.string().optional(),
        }).optional())
        .query(({ input }) => getTransactionTotals(input ?? {})),
      export: protectedProcedure
        .input(z.object({
          from: z.string().optional(),
          to: z.string().optional(),
          settled: z.boolean().optional(),
          payment_page: z.number().int().optional(),
          customer: z.number().int().optional(),
          currency: z.string().optional(),
          settlement: z.number().int().optional(),
          amount: z.number().optional(),
          status: z.string().optional(),
        }).optional())
        .query(({ input }) => exportTransactions(input ?? {})),
      chargeAuthorization: protectedProcedure
        .input(z.object({
          authorization_code: z.string().min(1),
          email: z.string().email(),
          amount: z.number().int().positive(),
          reference: z.string().optional(),
          plan: z.string().optional(),
          currency: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
          subaccount: z.string().optional(),
          transaction_charge: z.number().optional(),
          bearer: z.enum(['account', 'subaccount']).optional(),
          invoice_limit: z.number().int().optional(),
        }))
        .mutation(({ input }) => chargeAuthorization(input)),
      checkAuthorization: protectedProcedure
        .input(z.object({
          authorization_code: z.string().min(1),
          email: z.string().email(),
          amount: z.number().int().positive(),
          currency: z.string().optional(),
        }))
        .mutation(({ input }) => checkAuthorization(input)),
      requestReauthorization: protectedProcedure
        .input(z.object({
          authorization_code: z.string().min(1),
          email: z.string().email(),
          amount: z.number().int().positive(),
          reference: z.string().optional(),
          currency: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }))
        .mutation(({ input }) => requestReauthorization(input)),
    }),
    charges: router({
      createBankTransfer: protectedProcedure
        .input(z.object({
          email: z.string().email(),
          amountKES: z.number().positive(),
          expiryMinutes: z.number().int().positive().max(1440).optional(),
        }))
        .mutation(({ input }) => createBankTransferCharge(input.email, input.amountKES, input.expiryMinutes)),
    }),
    orders: router({
      create: protectedProcedure
        .input(z.object({
          customer: z.union([z.string().min(1), z.number().int().positive()]),
          lineItems: z.array(z.object({
            product: z.number().int().positive(),
            quantity: z.number().int().positive(),
          })).min(1),
        }))
        .mutation(({ input }) => createPaystackOrder({
          customer: input.customer,
          line_items: input.lineItems,
        })),
      list: protectedProcedure
        .input(z.object({
          perPage: z.number().int().positive().max(100).optional(),
          page: z.number().int().positive().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
        }).optional())
        .query(({ input }) => listPaystackOrders(input ?? {})),
      get: protectedProcedure
        .input(z.number().int().positive())
        .query(({ input }) => fetchPaystackOrder(input)),
      product: protectedProcedure
        .input(z.number().int().positive())
        .query(({ input }) => fetchPaystackProductOrders(input)),
      validate: protectedProcedure
        .input(z.string().min(1))
        .query(({ input }) => validatePaystackOrder(input)),
    }),
  }),

  // Notification procedures
  notifications: router({
    create: protectedProcedure
      .input(z.object({
        type: z.enum(['order_placed', 'order_confirmed', 'order_shipped', 'order_delivered', 'payment_failed', 'system'] as const),
        title: z.string(),
        content: z.string().optional(),
        orderId: z.number().optional(),
      }))
      .mutation(({ ctx, input }) => createNotification(ctx.user.id, input as any)),
    
    list: protectedProcedure.query(({ ctx }) => getUserNotifications(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
