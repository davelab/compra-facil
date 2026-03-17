import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import type { Analysis } from "@/lib/parse-csv"

const fmt = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
})

interface SummaryCardsProps {
  analysis: Analysis
}

export function SummaryCards({ analysis }: SummaryCardsProps) {
  const {
    rankedStats,
    optimalTotal,
    totalItems,
    mostCheapest,
    supermarkets,
    cheapestWins,
    mostExpensive,
    maxExpensive,
    priciest,
  } = analysis

  const supermarketsUsed = supermarkets.filter(
    (sm) => (cheapestWins[sm] ?? 0) > 0
  ).length

  return (
    <div className="flex flex-col gap-4">
      {/* Compra Facil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span>🎯</span>
            <span>Compra Facil</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">
            {fmt.format(optimalTotal)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Comprando cada producto en el supermercado más barato — {totalItems}{" "}
            productos en{" "}
            <span className="font-medium text-foreground">
              {supermarketsUsed} de {supermarkets.length}
            </span>{" "}
            supermercados
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Más productos baratos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>🥇</span>
              <span>Más productos baratos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {mostCheapest
                .filter((m) => m.wins === analysis.maxWins)
                .map((m) => (
                  <Badge key={m.sm} className="text-sm">
                    {m.sm} — {m.wins} productos
                  </Badge>
                ))}
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Productos más baratos por supermercado:
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {supermarkets.map((sm) => (
                <span key={sm} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{sm}</span>:{" "}
                  {cheapestWins[sm] ?? 0}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Más productos caros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>💸</span>
              <span>Más productos caros</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {mostExpensive
                .filter((m) => m.count === maxExpensive)
                .map((m) => (
                  <Badge key={m.sm} variant="destructive" className="text-sm">
                    {m.sm} — {m.count} productos
                  </Badge>
                ))}
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Productos más caros por supermercado:
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {supermarkets.map((sm) => (
                <span key={sm} className="text-muted-foreground">
                  <span className="font-medium text-foreground">{sm}</span>:{" "}
                  {priciest[sm] ?? 0}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Per-supermarket cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rankedStats.map((stat) => (
          <Card key={stat.sm}>
            <CardHeader>
              <CardTitle className="text-base">{stat.sm}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-2xl font-bold">
                {fmt.format(stat.fullBasketTotal)}
              </p>
              {stat.missing === 0 ? (
                <p className="text-xs text-muted-foreground">
                  ✓ Todos los {totalItems} productos
                </p>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠ Faltan {stat.missing} (completados al precio más bajo)
                </p>
              )}
              <p className="text-xs text-red-600 dark:text-red-400">
                + {fmt.format(stat.extraVsOptimal)} vs óptimo (+
                {stat.extraPct.toFixed(1)}%)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
