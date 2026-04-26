import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getProducts, getProductById, getFeaturedProducts, getUserCart, addToCart, getUserOrders, createOrder, getCategories, createNotification, getUserNotifications, getUserWishlist, addToWishlist, removeFromWishlist, upsertUser } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
