import { desc, eq } from "drizzle-orm"
import { db } from "./client"
import { categories, prices, priceSnapshots, products, supermarkets } from "./schema"
import type { PriceRow } from "../analysis"

export async function getLatestSnapshot(): Promise<PriceRow[]> {
  const [latest] = await db
    .select({ id: priceSnapshots.id })
    .from(priceSnapshots)
    .orderBy(desc(priceSnapshots.snapshotDate))
    .limit(1)

  if (!latest) return []

  const rows = await db
    .select({
      productName: products.name,
      category: categories.name,
      unit: products.unit,
      supermarket: supermarkets.name,
      price: prices.price,
    })
    .from(prices)
    .innerJoin(products, eq(prices.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(supermarkets, eq(prices.supermarketId, supermarkets.id))
    .where(eq(prices.snapshotId, latest.id))
    .orderBy(supermarkets.id, products.id)

  // Drizzle returns numeric columns as strings — coerce to number | null
  return rows.map((row) => ({
    ...row,
    price: row.price !== null ? parseFloat(row.price) : null,
  }))
}
