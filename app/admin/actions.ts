"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db/client"
import {
  categories,
  prices,
  priceSnapshots,
  products,
  supermarkets,
} from "@/lib/db/schema"
import {
  getAllSupermarkets,
  getAllCategories,
  getAllProducts,
  getAllSnapshots,
  getPricesForSnapshot,
} from "@/lib/db/admin-queries"

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")

// ── Re-fetch actions (called from client to reload data after mutations) ──────

export async function fetchSupermarkets() {
  return getAllSupermarkets()
}
export async function fetchCategories() {
  return getAllCategories()
}
export async function fetchProducts() {
  return getAllProducts()
}
export async function fetchSnapshots() {
  return getAllSnapshots()
}
export async function fetchPrices(snapshotId: number) {
  return getPricesForSnapshot(snapshotId)
}

// ── Supermarkets ──────────────────────────────────────────────────────────────

export async function createSupermarket(name: string) {
  await db.insert(supermarkets).values({ name: name.trim(), slug: toSlug(name) })
  revalidatePath("/")
}

export async function updateSupermarket(id: number, name: string) {
  await db
    .update(supermarkets)
    .set({ name: name.trim(), slug: toSlug(name) })
    .where(eq(supermarkets.id, id))
  revalidatePath("/")
}

export async function deleteSupermarket(id: number) {
  await db.delete(supermarkets).where(eq(supermarkets.id, id))
  revalidatePath("/")
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function createCategory(name: string) {
  await db.insert(categories).values({ name: name.trim(), slug: toSlug(name) })
  revalidatePath("/")
}

export async function updateCategory(id: number, name: string) {
  await db
    .update(categories)
    .set({ name: name.trim(), slug: toSlug(name) })
    .where(eq(categories.id, id))
  revalidatePath("/")
}

export async function deleteCategory(id: number) {
  await db.delete(categories).where(eq(categories.id, id))
  revalidatePath("/")
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function createProduct(
  name: string,
  unit: string,
  categoryId: number,
) {
  await db
    .insert(products)
    .values({ name: name.trim(), unit: unit.trim(), categoryId })
  revalidatePath("/")
}

export async function updateProduct(
  id: number,
  name: string,
  unit: string,
  categoryId: number,
) {
  await db
    .update(products)
    .set({ name: name.trim(), unit: unit.trim(), categoryId })
    .where(eq(products.id, id))
  revalidatePath("/")
}

export async function deleteProduct(id: number) {
  await db.delete(products).where(eq(products.id, id))
  revalidatePath("/")
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export async function createSnapshot(label: string, snapshotDate: string) {
  await db
    .insert(priceSnapshots)
    .values({ label: label.trim(), snapshotDate })
  revalidatePath("/")
}

export async function deleteSnapshot(id: number) {
  await db.delete(priceSnapshots).where(eq(priceSnapshots.id, id))
  revalidatePath("/")
}

// ── Prices ────────────────────────────────────────────────────────────────────

export async function upsertPrice(
  snapshotId: number,
  productId: number,
  supermarketId: number,
  priceValue: string | null,
) {
  const existing = await db
    .select({ id: prices.id })
    .from(prices)
    .where(
      and(
        eq(prices.snapshotId, snapshotId),
        eq(prices.productId, productId),
        eq(prices.supermarketId, supermarketId),
      ),
    )
    .limit(1)

  const normalised =
    priceValue === null || priceValue.trim() === ""
      ? null
      : parseFloat(priceValue.replace(",", ".")).toFixed(2)

  if (existing.length > 0) {
    await db
      .update(prices)
      .set({ price: normalised })
      .where(eq(prices.id, existing[0].id))
  } else {
    await db.insert(prices).values({
      snapshotId,
      productId,
      supermarketId,
      price: normalised,
    })
  }
  revalidatePath("/")
}
