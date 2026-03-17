// Env is loaded via --env-file=.env.local in the npm script
import { sql } from "drizzle-orm"
import { db } from "../lib/db/client"

async function testConnection() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:\/\/.*@/, "://<credentials>@"))

  console.log("\nTesting connection...")
  const result = await db.execute(sql`SELECT current_database(), current_user, version()`)
  const row = result[0] as Record<string, string>
  console.log("  database :", row.current_database)
  console.log("  user     :", row.current_user)
  console.log("  version  :", row.version.split(" ").slice(0, 2).join(" "))

  console.log("\nChecking tables...")
  const tables = await db.execute(sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `)
  const expected = ["categories", "price_snapshots", "prices", "products", "supermarkets"]
  for (const name of expected) {
    const exists = (tables as unknown as { tablename: string }[]).some((t) => t.tablename === name)
    console.log(`  ${exists ? "✓" : "✗"} ${name}`)
  }

  const missing = expected.filter(
    (name) => !(tables as unknown as { tablename: string }[]).some((t) => t.tablename === name),
  )
  if (missing.length > 0) {
    console.log(`\n⚠  Missing tables: ${missing.join(", ")}`)
    console.log("   Run the migration: paste supabase/migrations/0001_init.sql into the Supabase SQL editor")
  } else {
    console.log("\nAll tables present.")

    const [{ count }] = await db.execute(sql`SELECT COUNT(*)::int as count FROM price_snapshots`) as { count: number }[]
    console.log(`  price_snapshots: ${count} row(s)`)
    if (count === 0) {
      console.log("  → No data yet. Run: npm run db:seed")
    }
  }

  process.exit(0)
}

testConnection().catch((err) => {
  console.error("\nConnection failed:", err.cause?.message ?? err.message)
  process.exit(1)
})
