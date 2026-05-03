import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, cartItems, orders, notifications, categories, products, productVariants, InsertOrder, InsertNotification, wishlistItems } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
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

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

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

// Order queries
export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function createOrder(userId: number, data: InsertOrder) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(orders).values({
    ...data,
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
