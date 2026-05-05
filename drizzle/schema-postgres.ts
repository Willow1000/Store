// PostgreSQL schema definitions for Brand and Model tables
// These should be added to drizzle/schema.ts or used alongside existing definitions

import { pgTable, bigserial, text, timestamp, jsonb, integer, smallint, uuid, index, unique, foreignKey, numeric, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Brand Table - Represents product brands/manufacturers
 */
export const brands = pgTable(
  "Brand",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    name: text("name").notNull().unique(),
    imageUrl: text("image_url"),
  },
  (table) => ({
    nameIdx: index("idx_brand_name").on(table.name),
  })
);

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

/**
 * Model Table - Represents product models with specifications
 */
export const models = pgTable(
  "model",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    year: integer("year"),
    name: text("name").unique(),
    specs: text("specs"),
  },
  (table) => ({
    nameIdx: index("idx_model_name").on(table.name),
  })
);

export type Model = typeof models.$inferSelect;
export type InsertModel = typeof models.$inferInsert;

/**
 * Updated Products Table - with Brand and Model relationships
 * This extends the existing products table with new fields
 */
export const productsExtended = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    url: text("url").notNull().unique(),
    categoryName: text("category_name").notNull(),
    ownerId: uuid("owner_id"),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    condition: text("condition").notNull(),
    coverImageUrl: text("cover_image_url").notNull(),
    brand: text("brand"),
    model: text("model"),
    itemSpecifics: jsonb("item_specifics"),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow(),
    discount: real("discount"),
    stock: smallint("stock").notNull().default(0),
    partNumber: text("part_number"),
  },
  (table) => ({
    brandForeignKey: foreignKey({
      columns: [table.brand],
      foreignColumns: [brands.name],
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    modelForeignKey: foreignKey({
      columns: [table.model],
      foreignColumns: [models.name],
    })
      .onUpdate("cascade")
      .onDelete("set null"),
    categoryNameIdx: index("idx_products_category_name").on(table.categoryName),
    ownerIdIdx: index("idx_products_owner_id").on(table.ownerId),
    priceIdx: index("idx_products_price").on(table.price),
    brandIdx: index("idx_products_brand").on(table.brand),
    modelIdx: index("idx_products_model").on(table.model),
    partNumberIdx: index("idx_products_part_number").on(table.partNumber),
  })
);

export type ProductExtended = typeof productsExtended.$inferSelect;
export type InsertProductExtended = typeof productsExtended.$inferInsert;

/**
 * Relations for Brand
 */
export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(productsExtended),
}));

/**
 * Relations for Model
 */
export const modelsRelations = relations(models, ({ many }) => ({
  products: many(productsExtended),
}));

/**
 * Relations for Products (extended)
 */
export const productsExtendedRelations = relations(productsExtended, ({ one }) => ({
  brand: one(brands, {
    fields: [productsExtended.brand],
    references: [brands.name],
  }),
  model: one(models, {
    fields: [productsExtended.model],
    references: [models.name],
  }),
}));
