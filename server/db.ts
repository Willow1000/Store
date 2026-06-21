import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { InsertUser, users, cartItems, orders, notifications, categories, products, productVariants, orderItems, InsertOrder, InsertNotification, wishlistItems, payments, InsertPayment, productSearchTracking, InsertProductSearchTracking, tickets, InsertTicket, offers } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

export function isDatabaseConfigured() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return false;
  }

  if (/YOUR_SUPABASE_PASSWORD|replace-with-your/i.test(databaseUrl)) {
    return false;
  }

  return true;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && isDatabaseConfigured()) {
    try {
      // Try to parse DATABASE_URL if it's a connection string, otherwise use as-is
      let poolConfig: any = {
        connectionString: process.env.DATABASE_URL,
        family: 4, // Force IPv4 only, not IPv6
        // Disable IPv6 at the socket level
        host: process.env.DATABASE_URL?.includes('://') 
          ? new URL(process.env.DATABASE_URL).hostname 
          : undefined,
      };
      
      // If we extracted a hostname, use explicit connection params
      if (poolConfig.host && process.env.DATABASE_URL?.includes('://')) {
        const url = new URL(process.env.DATABASE_URL);
        poolConfig = {
          user: url.username || 'postgres',
          password: url.password || '',
          host: url.hostname,
          port: parseInt(url.port || '5432', 10),
          database: url.pathname.substring(1) || 'postgres',
          family: 4,
        };
      }

      _pool = new Pool(poolConfig);
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  if (!isDatabaseConfigured()) {
    return undefined;
  }

  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Product queries
export async function getProducts(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).limit(limit).offset(offset);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFeaturedProducts(limit = 8) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.featured, true)).limit(limit);
}

export async function getNewArrivals(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).orderBy(desc(products.createdAt)).limit(limit);
}

export async function getDeals(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  // Products with discount column filled, ordered by freeShipping and discount percentage
  return db.select().from(products)
    .where(sql`${products.discount} IS NOT NULL`)
    .orderBy(sql`${products.freeShipping} DESC, (${products.discount} - ${products.price}) / ${products.discount} DESC`)
    .limit(limit);
}

export async function getTrendingProducts(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  // Healthy mix: recent products (newer weighted favorably) + good ratings + deals
  return db.select().from(products)
    .orderBy(
      sql`(CAST(${products.rating} AS DECIMAL(5, 2)) * 2) DESC`,
      desc(products.createdAt)
    )
    .limit(limit);
}

// Cart queries
export async function getUserCart(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const items = await db.select().from(cartItems).where(eq(cartItems.userId, userId));
  
  const itemsWithProducts = await Promise.all(
    items.map(async (item) => {
      const product = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      return {
        ...item,
        product: product[0] || null,
      };
    })
  );
  
  return itemsWithProducts;
}

export async function addToCart(userId: number, productId: number, variantId?: number, quantity = 1) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await db.select().from(cartItems).where(
    and(
      eq(cartItems.userId, userId),
      eq(cartItems.productId, productId),
      variantId ? eq(cartItems.variantId, variantId) : undefined
    )
  ).limit(1);
  
  if (existing.length > 0) {
    const item = existing[0];
    await db.update(cartItems)
      .set({ quantity: (item.quantity || 1) + quantity })
      .where(eq(cartItems.id, item.id));
    return item;
  }
  
  const result = await db.insert(cartItems).values({
    userId,
    productId,
    variantId,
    quantity,
  });
  return result;
}

export async function clearUserCart(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return db.delete(cartItems).where(eq(cartItems.userId, userId));
}

// Order queries
export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export type ResolvedOffer = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  type: 'percentage' | 'fixed';
  value: string;
  minimumSubtotal: string | null;
  discountAmount: number;
};

export type OrderItemInput = {
  productId: number;
  variantId?: number | null;
  quantity: number;
  price: string | number;
};

export type OrderItemEmailSummary = {
  name: string;
  sku: string;
  description: string;
  quantity: number;
  price: string;
  unit_price: string;
  line_total: string;
};

export type ProductSearchTrackingInput = {
  sessionId: string;
  userId?: string | null;
  eventType: 'search' | 'product_click';
  searchTerm?: string | null;
  filters?: Record<string, unknown>;
  resultsCount?: number;
  matchedProductIds?: Array<string | number>;
  clickedProductId?: string | number | null;
  pageUrl?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordProductSearchTrackingEvent(input: ProductSearchTrackingInput): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const userId = typeof input.userId === 'string' && /^[0-9a-fA-F-]{36}$/.test(input.userId)
    ? input.userId
    : null;
  const clickedProductId = input.clickedProductId !== undefined && input.clickedProductId !== null
    ? String(input.clickedProductId)
    : null;

  const metadata = {
    ...(input.metadata ?? {}),
    ...(input.userId !== undefined && input.userId !== null && userId === null
      ? { user_id: String(input.userId) }
      : {}),
    ...(input.clickedProductId !== undefined && input.clickedProductId !== null && clickedProductId === null
      ? { clicked_product_id: String(input.clickedProductId) }
      : {}),
  };

  try {
    await db.execute(sql`
      insert into public.product_search_tracking (
        sessionid,
        userid,
        eventtype,
        searchterm,
        filters,
        resultscount,
        matchedproductids,
        clickedproductid,
        pageurl,
        referrer,
        useragent,
        metadata,
        createdat
      ) values (
        ${input.sessionId},
        ${userId},
        ${input.eventType},
        ${input.searchTerm ?? null},
        ${JSON.stringify(input.filters ?? {})}::jsonb,
        ${Number.isFinite(input.resultsCount as number) ? Number(input.resultsCount) : 0},
        ${JSON.stringify(input.matchedProductIds ?? [])}::jsonb,
        ${clickedProductId},
        ${input.pageUrl ?? null},
        ${input.referrer ?? null},
        ${input.userAgent ?? null},
        ${JSON.stringify(metadata)}::jsonb,
        timezone('utc', now())
      )
    `);

    return true;
  } catch (error) {
    console.warn('[Track] Failed to insert tracking event directly:', error);
    return false;
  }
}

  export async function recentSimilarTrackingExists(params: {
    sessionId: string;
    eventType: 'search' | 'product_click';
    searchTerm?: string | null;
    clickedProductId?: string | null;
    resultsCount?: number;
    withinSeconds?: number;
  }): Promise<boolean> {
    const db = await getDb();
    if (!db) return false;

    const within = params.withinSeconds ?? 5;
    const searchTerm = params.searchTerm ?? null;
    const clickedProductId = params.clickedProductId ?? null;
    const resultsCount = Number(params.resultsCount ?? 0);

    try {
      const res = await db.execute(sql`
        select count(*) as cnt from public.product_search_tracking
        where sessionid = ${params.sessionId}
          and eventtype = ${params.eventType}
          and coalesce(searchterm,'') = coalesce(${searchTerm}, '')
          and coalesce(clickedproductid,'') = coalesce(${clickedProductId}, '')
          and coalesce(resultscount, 0) = ${resultsCount}
          and createdat > timezone('utc', now() - (${within} || ' seconds')::interval)
      `);

      // db.execute returns an array-like result; inspect first row
      const row = (res && Array.isArray(res) && res[0]) ? res[0] : null;
      let cnt = 0;
      if (row) {
        const raw = (row as any).cnt ?? (row as any).count ?? (row as any)["count"] ?? (row as any)["CNT"] ?? 0;
        cnt = Number(raw || 0);
      }
      return cnt > 0;
    } catch (err) {
      console.warn('[Track] Failed to check recentSimilarTrackingExists:', err);
      return false;
    }
  }

export async function getOfferByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;

  const normalizedCode = code.trim().toUpperCase();
  // Compare codes case-insensitively in the database to tolerate mixed-case storage
  const result = await db.select().from(offers).where(sql`upper(${offers.code}) = ${normalizedCode}`).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function resolveOfferByCode(code: string, subtotal: number): Promise<ResolvedOffer | null> {
  const db = await getDb();
  if (!db) return null;

  const offer = await getOfferByCode(code);
  if (!offer) return null;

  const now = new Date();
  if (!offer.active) return null;
  if (offer.startsAt && new Date(offer.startsAt) > now) return null;
  if (offer.endsAt && new Date(offer.endsAt) < now) return null;
  if (offer.maxUses !== null && offer.maxUses !== undefined && Number(offer.usedCount ?? 0) >= offer.maxUses) return null;
  if (offer.minimumSubtotal && subtotal < Number(offer.minimumSubtotal)) return null;

  // Calculate discount based on offer type
  // - 'percentage': discount = subtotal * (value / 100)
  // - 'fixed': discount = min(value, subtotal) to ensure discount doesn't exceed total
  const numericValue = Number(offer.value);
  const discountAmount = offer.type === 'percentage'
    ? subtotal * (numericValue / 100)
    : Math.min(numericValue, subtotal);

  return {
    id: offer.id,
    code: offer.code,
    name: offer.name,
    description: offer.description ?? null,
    type: offer.type,
    value: String(offer.value),
    minimumSubtotal: offer.minimumSubtotal ? String(offer.minimumSubtotal) : null,
    discountAmount: Number(discountAmount.toFixed(2)),
  };
}

export async function incrementOfferUsage(offerId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(offers).set({ usedCount: sql`${offers.usedCount} + 1`, updatedAt: new Date() }).where(eq(offers.id, offerId));
}

export async function createOrderItems(orderId: number, items: OrderItemInput[]): Promise<OrderItemEmailSummary[]> {
  const db = await getDb();
  if (!db || items.length === 0) return [];

  await db.insert(orderItems).values(
    items.map((item) => ({
      orderId,
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: item.quantity,
      price: String(item.price),
    }))
  );

  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  const productRows = await db.select().from(products).where(inArray(products.id, productIds));
  const productMap = new Map(productRows.map((product) => [product.id, product]));

  return items.map((item) => {
    const product = productMap.get(item.productId);
    const unitPrice = Number(item.price);
    const lineTotal = unitPrice * item.quantity;

    return {
      name: product?.name || `Product #${item.productId}`,
      sku: (product as any)?.sku || '',
      description: product?.description || '',
      quantity: item.quantity,
      price: String(item.price),
      unit_price: unitPrice.toFixed(2),
      line_total: lineTotal.toFixed(2),
    };
  });
}

export async function createOrder(
  userId: number,
  data: Omit<InsertOrder, 'userId'>,
  userEmail?: string,
  customerName?: string,
  items?: OrderItemInput[],
) {
  const db = await getDb();
  if (!db) return null;
  
  const insertedRows = await db.insert(orders).values({
    ...data,
    userId,
  }).returning({ id: orders.id });

  const orderId = insertedRows[0]?.id;
  let enrichedItems: OrderItemEmailSummary[] = [];

  if (orderId && items && items.length > 0) {
    try {
      enrichedItems = await createOrderItems(orderId, items);
    } catch (error) {
      console.warn('[Orders] Failed to create order items:', error);
    }
  }

  if (data.offerId) {
    try {
      await incrementOfferUsage(Number(data.offerId));
    } catch (error) {
      console.warn('[Offers] Failed to increment usage count:', error);
    }
  }
  
  // Send confirmation email asynchronously (don't wait for it)
  if (userEmail) {
    try {
      const { sendOrderConfirmationEmail } = await import('./_core/emailService');
      const orderDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      await sendOrderConfirmationEmail(userEmail, {
        customer_name: customerName || (userEmail.includes('@') ? userEmail.split('@')[0].replace(/[._-]+/g, ' ').trim().replace(/\b\w/g, (char) => char.toUpperCase()) : 'Valued Customer'),
        order_number: data.orderNumber as string,
        order_date: orderDate,
        order_total: data.total as string,
        currency: 'USD',
        order_url: `https://store-nine-eosin.vercel.app/orders/${orderId || userId}`,
        support_email: process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER || 'support@motorvault.shop',
        items: enrichedItems,
      }).catch((err: unknown) => console.error('[Order Confirmation Email] Error:', err));
    } catch (error) {
      console.error('[Email Service] Failed to send confirmation email:', error);
      // Don't throw - order was created successfully, email is just a bonus
    }
  }
  
  return insertedRows[0] ?? null;
}

// Payment queries
export async function createPayment(orderId: number, userId: number, data: Omit<InsertPayment, 'orderId' | 'userId'>) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(payments).values({
    ...data,
    orderId,
    userId,
  });
  return result;
}

// Category queries
export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories);
}

// Ticket queries
export async function createTicket(data: InsertTicket) {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[createTicket] Database not available');
      return null;
    }
    const result = await db.insert(tickets).values(data).returning();
    return result[0] || null;
  } catch (error) {
    console.error('[createTicket] Error:', error);
    throw error;
  }
}

export async function getTicketsByUserId(userId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.createdAt));
}

export async function getTicketsByEmail(email: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tickets).where(eq(tickets.contactEmail, email)).orderBy(desc(tickets.createdAt));
}

export async function getTicketByReferenceCode(referenceCode: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tickets).where(eq(tickets.referenceCode, referenceCode));
  return result[0] || null;
}

export async function updateTicket(referenceCode: string, data: Partial<InsertTicket>) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.update(tickets).set({ ...data, updatedAt: new Date() }).where(eq(tickets.referenceCode, referenceCode)).returning();
  return result[0] || null;
}

// Notification queries
export async function createNotification(userId: number, data: Omit<InsertNotification, 'userId'>) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(notifications).values({
    ...data,
    userId,
  } as InsertNotification);
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
}

// Wishlist queries
export async function getUserWishlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const items = await db.select().from(wishlistItems).where(eq(wishlistItems.userId, userId));
  
  const itemsWithProducts = await Promise.all(
    items.map(async (item) => {
      const product = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      return {
        ...item,
        product: product[0] || null,
      };
    })
  );
  
  return itemsWithProducts;
}

export async function addToWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const existing = await db.select().from(wishlistItems).where(
    and(
      eq(wishlistItems.userId, userId),
      eq(wishlistItems.productId, productId)
    )
  ).limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const result = await db.insert(wishlistItems).values({
    userId,
    productId,
  });
  return result;
}

// Log a product search / filter event
export async function logProductSearch(entry: InsertProductSearchTracking) {
  const db = await getDb();
  if (!db) {
    console.warn('[logProductSearch] DB not available');
    return null;
  }

  try {
    const res = await db.insert(productSearchTracking).values(entry as any);
    return res;
  } catch (err) {
    console.error('[logProductSearch] Failed to insert tracking row:', err);
    return null;
  }
}

export async function removeFromWishlist(userId: number, productId: number) {
  const db = await getDb();
  if (!db) return null;
  
  return db.delete(wishlistItems).where(
    and(
      eq(wishlistItems.userId, userId),
      eq(wishlistItems.productId, productId)
    )
  );
}
