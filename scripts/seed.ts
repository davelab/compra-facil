/**
 * Seed script: imports public/data.csv as the first price snapshot.
 * Run once after creating the Supabase project and running migrations.
 *
 * Usage:
 *   Set DATABASE_URL in .env.local, then run: npm run db:seed
 */
// Env is loaded via --env-file=.env.local in the npm script
import { readFileSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"
import Papa from "papaparse"
import { db } from "../lib/db/client"
import {
  categories,
  prices,
  priceSnapshots,
  products,
  supermarkets,
} from "../lib/db/schema"
import { parsePrice } from "../lib/parse-csv"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function seed() {
  // Skip if already seeded
  const existing = await db
    .select({ id: priceSnapshots.id })
    .from(priceSnapshots)
    .limit(1)

  if (existing.length > 0) {
    console.log("Already seeded — skipping. Delete all price_snapshots rows to re-seed.")
    process.exit(0)
  }

  const csvPath = path.join(__dirname, "../public/data.csv")
  const csvText = readFileSync(csvPath, "utf-8")
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  })
  const rows = result.data as string[][]
  const header = rows[0]
  const smNames = header.slice(3).filter((s) => s.trim() !== "")

  // 1. Supermarkets (ordered — preserves CSV column order via serial id)
  const smInserts = await db
    .insert(supermarkets)
    .values(
      smNames.map((name) => ({
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
      })),
    )
    .onConflictDoNothing()
    .returning()

  const smMap = new Map(smInserts.map((sm) => [sm.name, sm.id]))
  console.log(`Inserted ${smInserts.length} supermarkets`)

  // 2. Categories
  const catSet = new Set<string>()
  for (let i = 1; i < rows.length; i++) {
    const cat = rows[i][1]?.trim()
    if (cat) catSet.add(cat)
  }

  const catInserts = await db
    .insert(categories)
    .values(
      [...catSet].map((name) => ({
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
      })),
    )
    .onConflictDoNothing()
    .returning()

  const catMap = new Map(catInserts.map((c) => [c.name, c.id]))
  console.log(`Inserted ${catInserts.length} categories`)

  // 3. Products
  const productValues: { name: string; unit: string; categoryId: number }[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const name = row[0]?.trim()
    const cat = row[1]?.trim() ?? ""
    const unit = row[2]?.trim() ?? ""
    if (!name || !catMap.has(cat)) continue
    productValues.push({ name, unit, categoryId: catMap.get(cat)! })
  }

  const prodInserts = await db
    .insert(products)
    .values(productValues)
    .onConflictDoNothing()
    .returning()

  const prodMap = new Map(prodInserts.map((p) => [p.name, p.id]))
  console.log(`Inserted ${prodInserts.length} products`)

  // 4. Snapshot
  const today = new Date().toISOString().split("T")[0]
  const [snapshot] = await db
    .insert(priceSnapshots)
    .values({ label: "Initial import from data.csv", snapshotDate: today })
    .returning()
  console.log(`Created snapshot id=${snapshot.id} date=${snapshot.snapshotDate}`)

  // 5. Prices
  const priceValues: {
    snapshotId: number
    productId: number
    supermarketId: number
    price: string | null
  }[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const name = row[0]?.trim()
    if (!name || !prodMap.has(name)) continue

    for (let j = 0; j < smNames.length; j++) {
      const sm = smNames[j]
      const smId = smMap.get(sm)
      const prodId = prodMap.get(name)
      if (!smId || !prodId) continue

      const price = parsePrice(row[j + 3])
      priceValues.push({
        snapshotId: snapshot.id,
        productId: prodId,
        supermarketId: smId,
        price: price !== null ? price.toFixed(2) : null,
      })
    }
  }

  // Insert in batches to avoid hitting parameter limits
  const BATCH = 500
  for (let i = 0; i < priceValues.length; i += BATCH) {
    await db.insert(prices).values(priceValues.slice(i, i + BATCH))
  }

  console.log(`Inserted ${priceValues.length} price entries`)
  console.log("Seed complete.")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
