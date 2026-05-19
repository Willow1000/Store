import { decimal, integer, pgEnum, pgTable, text, timestamp, varchar, boolean, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Define enums at the top level
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const statusEnum = pgEnum("status", ["pending", "confirmed", "shipped", "delivered", "cancelled"]);
export const typeEnum = pgEnum("type", ["order_placed", "order_confirmed", "order_shipped", "order_delivered", "payment_failed", "system"]);
export const conditionEnum = pgEnum("condition", ["new", "like-new", "good", "fair", "used"]);
export const offerTypeEnum = pgEnum("offer_type", ["percentage", "fixed"]);

// Ticketing enums
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved", "closed"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high"]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Categories Table
export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

// Sellers Table
export const sellers = pgTable("sellers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  storeName: varchar("storeName", { length: 255 }).notNull(),
  description: text("description"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  verified: boolean("verified").default(false),
  totalSales: integer("totalSales").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = typeof sellers.$inferInsert;

// Products Table
export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("originalPrice", { precision: 10, scale: 2 }),
  discount: decimal("discount", { precision: 10, scale: 2 }),
  categoryId: integer("categoryId").notNull(),
  sellerId: integer("sellerId").notNull(),
  condition: conditionEnum("condition").default("new"),
  images: jsonb("images"),
  stock: integer("stock").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("totalReviews").default(0),
  featured: boolean("featured").default(false),
  freeShipping: boolean("freeShipping").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// Product Variants Table
export const productVariants = pgTable("productVariants", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  productId: integer("productId").notNull(),
  size: varchar("size", { length: 50 }),
  color: varchar("color", { length: 50 }),
  sku: varchar("sku", { length: 100 }).unique(),
  stock: integer("stock").default(0),
  price: decimal("price", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = typeof productVariants.$inferInsert;

// Cart Items Table
export const cartItems = pgTable("cartItems", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  productId: integer("productId").notNull(),
  variantId: integer("variantId"),
  quantity: integer("quantity").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;

// Wishlist Table
export const wishlistItems = pgTable("wishlistItems", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  productId: integer("productId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = typeof wishlistItems.$inferInsert;

// Offers Table
export const offers = pgTable("offers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: offerTypeEnum("type").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minimumSubtotal: decimal("minimumSubtotal", { precision: 10, scale: 2 }),
  maxUses: integer("maxUses"),
  usedCount: integer("usedCount").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  startsAt: timestamp("startsAt", { withTimezone: true }),
  endsAt: timestamp("endsAt", { withTimezone: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

// Orders Table
export const orders = pgTable("orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  status: statusEnum("status").default("pending"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal("shippingCost", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb("shippingAddress"),
  billingAddress: jsonb("billingAddress"),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  offerId: integer("offerId"),
  offerCode: varchar("offerCode", { length: 64 }),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  paystackPaymentId: varchar("paystackPaymentId", { length: 255 }),
  trackingNumber: varchar("trackingNumber", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// Order Items Table
export const orderItems = pgTable("orderItems", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer("orderId").notNull(),
  productId: integer("productId").notNull(),
  variantId: integer("variantId"),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// Notifications Table
export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("userId").notNull(),
  type: typeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  orderId: integer("orderId"),
  read: boolean("read").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// Payments Table - Records all payment transactions from Paystack/Stripe/etc
export const payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer("orderId").notNull(),
  userId: integer("userId").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // 'paystack', 'stripe', 'mpesa', 'paypal'
  reference: varchar("reference", { length: 255 }).notNull().unique(), // Paystack reference or Stripe intent ID
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Amount in currency smallest unit
  currency: varchar("currency", { length: 3 }).notNull().default('USD'), // Currency code
  status: varchar("status", { length: 50 }).notNull(), // 'success', 'pending', 'failed'
  channel: varchar("channel", { length: 50 }), // 'card', 'bank_transfer', 'ussd', 'mobile_money'
  gatewayResponse: text("gatewayResponse"), // Raw response from payment gateway
  authorizationCode: varchar("authorizationCode", { length: 255 }), // Auth code from card/bank
  cardBin: varchar("cardBin", { length: 10 }), // Card BIN for analytics
  cardLast4: varchar("cardLast4", { length: 4 }), // Last 4 digits of card
  cardBrand: varchar("cardBrand", { length: 50 }), // visa, mastercard, etc
  bank: varchar("bank", { length: 255 }), // Bank name for bank transfers
  ipAddress: varchar("ipAddress", { length: 45 }), // IP address of payer
  metadata: jsonb("metadata"), // Custom metadata stored with transaction
  fees: decimal("fees", { precision: 10, scale: 2 }), // Processing fees
  paidAt: timestamp("paidAt"), // When payment was confirmed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// Product Search Tracking Table
export const productSearchTracking = pgTable("product_search_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: varchar("sessionId", { length: 128 }).notNull(),
  userId: uuid("userId"),
  eventType: varchar("eventType", { length: 32 }).notNull(),
  searchTerm: text("searchTerm"),
  filters: jsonb("filters").default('{}'),
  resultsCount: integer("resultsCount").default(0),
  matchedProductIds: jsonb("matchedProductIds").default('[]'),
  clickedProductId: uuid("clickedProductId"),
  pageUrl: text("pageUrl"),
  referrer: text("referrer"),
  userAgent: text("userAgent"),
  metadata: jsonb("metadata").default('{}'),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export type ProductSearchTracking = typeof productSearchTracking.$inferSelect;
export type InsertProductSearchTracking = typeof productSearchTracking.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  seller: one(sellers, {
    fields: [users.id],
    references: [sellers.userId],
  }),
  orders: many(orders),
  cartItems: many(cartItems),
  wishlistItems: many(wishlistItems),
  notifications: many(notifications),
}));

export const sellersRelations = relations(sellers, ({ one, many }) => ({
  user: one(users, {
    fields: [sellers.userId],
    references: [users.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  seller: one(sellers, {
    fields: [products.sellerId],
    references: [sellers.id],
  }),
  variants: many(productVariants),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  offer: one(offers, {
    fields: [orders.offerId],
    references: [offers.id],
  }),
  items: many(orderItems),
  notifications: many(notifications),
}));

export const offersRelations = relations(offers, ({ many }) => ({
  orders: many(orders),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [notifications.orderId],
    references: [orders.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, {
    fields: [wishlistItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
}));

// Tickets / Support table
export const tickets = pgTable("tickets", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  referenceCode: varchar("referenceCode", { length: 64 }).notNull().unique(),
  userId: varchar("userId", { length: 36 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 32 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: ticketStatusEnum("status").default("open").notNull(),
  priority: ticketPriorityEnum("priority").default("medium").notNull(),
  channel: varchar("channel", { length: 50 }).default("web"),
  assignedTo: varchar("assignedTo", { length: 36 }),
  tags: jsonb("tags").default('[]'),
  attachments: jsonb("attachments").default('[]'),
  metadata: jsonb("metadata").default('{}'),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;
