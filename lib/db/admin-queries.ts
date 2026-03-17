import { desc, eq, sql } from "drizzle-orm"
import { db } from "./client"
import {
  categories,
  prices,
  priceSnapshots,
  products,
  supermarkets,
} from "./schema"

export async function getAllSupermarkets() {
  return db.select().from(supermarkets).orderBy(supermarkets.id)
}

export async function getAllCategories() {
  return db.select().from(categories).orderBy(categories.name)
}

export async function getAllProducts() {
  return db
    .select({
      id: products.id,
      name: products.name,
      unit: products.unit,
      categoryId: products.categoryId,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(categories.name, products.name)
}

export async function getAllSnapshots() {
  return db
    .select({
      id: priceSnapshots.id,
      label: priceSnapshots.label,
      snapshotDate: priceSnapshots.snapshotDate,
      createdAt: priceSnapshots.createdAt,
      priceCount: sql<number>`count(${prices.id})::int`,
    })
    .from(priceSnapshots)
    .leftJoin(prices, eq(prices.snapshotId, priceSnapshots.id))
    .groupBy(priceSnapshots.id)
    .orderBy(desc(priceSnapshots.snapshotDate))
}

export async function getPricesForSnapshot(snapshotId: number) {
  return db
    .select({
      id: prices.id,
      productId: prices.productId,
      supermarketId: prices.supermarketId,
      price: prices.price,
      productName: products.name,
      supermarketName: supermarkets.name,
    })
    .from(prices)
    .innerJoin(products, eq(prices.productId, products.id))
    .innerJoin(supermarkets, eq(prices.supermarketId, supermarkets.id))
    .where(eq(prices.snapshotId, snapshotId))
    .orderBy(products.name, supermarkets.id)
}
