import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Analysis } from "@/lib/parse-csv"

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" })

interface SummaryCardsProps {
  analysis: Analysis
}

export function SummaryCards({ analysis }: SummaryCardsProps) {
  const { rankedStats, optimalTotal, totalItems, mostCheapest, supermarkets, cheapestWins } =
    analysis

  const winner = rankedStats[0]
  const isOptimalWinner = winner && winner.missing === 0 && winner.extraVsOptimal <= 0.001

  return (
    <div className="flex flex-col gap-4">
      {/* Cesta Óptima */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span>🎯</span>
            <span>Cesta Óptima</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">{fmt.format(optimalTotal)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Comprando cada producto en el supermercado más barato — {totalItems} productos
          </p>
        </CardContent>
      </Card>

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
          <p className="mb-2 text-xs text-muted-foreground">Productos más baratos por supermercado:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {supermarkets.map((sm) => (
              <span key={sm} className="text-muted-foreground">
                <span className="font-medium text-foreground">{sm}</span>: {cheapestWins[sm] ?? 0}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Per-supermarket cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rankedStats.map((stat, idx) => {
          const isWinner = idx === 0
          const deltaVsOptimal = stat.extraVsOptimal
          const pct = stat.extraPct

          return (
            <Card key={stat.sm} className={isWinner ? "ring-2 ring-primary" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{stat.sm}</span>
                  {isWinner && (
                    <Badge variant="default" className="text-xs">
                      Cesta más barata
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-2xl font-bold">{fmt.format(stat.fullBasketTotal)}</p>
                {stat.missing === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    ✓ Todos los {totalItems} productos
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    ⚠ Faltan {stat.missing} (completados al precio más bajo)
                  </p>
                )}
                {isWinner ? (
                  <Badge variant="outline" className="w-fit text-xs text-primary">
                    Cesta más barata
                  </Badge>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    + {fmt.format(deltaVsOptimal)} vs óptimo (+{pct.toFixed(1)}%)
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
