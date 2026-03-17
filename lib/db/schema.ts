import {
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  date,
} from "drizzle-orm/pg-core"

export const supermarkets = pgTable("supermarkets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
})

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
})

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  unit: text("unit").notNull(),
  categoryId: integer("category_id")
    .references(() => categories.id)
    .notNull(),
})

export const priceSnapshots = pgTable("price_snapshots", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  snapshotDate: date("snapshot_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const prices = pgTable("prices", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id")
    .references(() => priceSnapshots.id)
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  supermarketId: integer("supermarket_id")
    .references(() => supermarkets.id)
    .notNull(),
  price: numeric("price", { precision: 8, scale: 2 }), // NULL = not available
})
