import { readFileSync } from "fs"
import path from "path"
import { parseCsv } from "@/lib/parse-csv"
import { SummaryCards } from "@/components/summary-cards"
import { PriceComparison } from "@/components/price-comparison"

export default function Page() {
  const csvPath = path.join(process.cwd(), "public", "data.csv")
  const csvText = readFileSync(csvPath, "utf-8")
  const analysis = parseCsv(csvText)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">🛒 Cesta Óptima</h1>
        <p className="mt-1 text-muted-foreground">
          Comparativa de precios de supermercados — encuentra la mejor cesta de la compra
        </p>
      </header>

      <section className="mb-10">
        <SummaryCards analysis={analysis} />
      </section>

      <section>
        <PriceComparison analysis={analysis} />
      </section>
    </main>
  )
}
