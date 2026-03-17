import { getLatestSnapshot } from "@/lib/db/queries"
import { buildAnalysis } from "@/lib/analysis"
import { SummaryCards } from "@/components/summary-cards"
import { CategoryRanking } from "@/components/category-ranking"
import { AppShell } from "@/components/app-shell"
import { ThemeToggle } from "@/components/theme-toggle"

export default async function Page() {
  const rows = await getLatestSnapshot()
  const analysis = buildAnalysis(rows)

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🛒 Compra Facil</h1>
          <p className="mt-1 text-muted-foreground">
            Comparativa de precios de supermercados — los precios reflejan la
            opción más barata de cada producto en cada supermercado
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section className="mb-10">
        <SummaryCards analysis={analysis} />
      </section>

      <AppShell
        analysis={analysis}
        categoryRanking={<CategoryRanking analysis={analysis} />}
      />
    </main>
  )
}
