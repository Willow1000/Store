import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from '@trpc/server';
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getProducts, getProductById, getFeaturedProducts, getNewArrivals, getDeals, getTrendingProducts, getUserCart, addToCart, getUserOrders, createOrder, getCategories, createNotification, getUserNotifications, getUserWishlist, addToWishlist, removeFromWishlist, upsertUser } from "./db";
import { initializeTransaction, verifyTransaction } from "./paystack";

function getRequestOrigin(req: { header: (name: string) => string | undefined; protocol?: string }): string | null {
  const forwardedProto = req.header('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.header('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.header('host');

  if (!protocol || !host) return null;
  return `${protocol}://${host}`;
}

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
    
    newArrivals: publicProcedure
      .input(z.object({ limit: z.number().default(30) }))
      .query(({ input }) => getNewArrivals(input.limit)),
    
    deals: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(({ input }) => getDeals(input.limit)),
    
    trending: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(({ input }) => getTrendingProducts(input.limit)),
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
      initialize: publicProcedure
        .input(z.object({
          email: z.string().email(),
          amount: z.number().int().positive(),
          reference: z.string().optional(),
          currency: z.string().optional(),
          description: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          const requestOrigin = getRequestOrigin(ctx.req);
          try {
            return await initializeTransaction({
              ...input,
              callback_url: process.env.PAYSTACK_CALLBACK_URL || (requestOrigin ? `${requestOrigin}/payment/callback` : undefined),
            });
          } catch (err: any) {
            console.error('[tRPC] initializeTransaction error:', err);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }),
      verify: publicProcedure
        .input(z.object({ reference: z.string() }))
        .query(({ input }) => verifyTransaction(input.reference)),
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
