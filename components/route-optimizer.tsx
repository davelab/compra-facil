"use client"

import { useState, useMemo } from "react"
import { PersonSimpleWalk, Bicycle, Bus, Motorcycle, Car } from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Analysis } from "@/lib/parse-csv"

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" })

const MODES = [
  { id: "walk", label: "Andando",  Icon: PersonSimpleWalk, defaultCost: 0    },
  { id: "bike", label: "Bicicleta", Icon: Bicycle,          defaultCost: 0    },
  { id: "bus",  label: "Bus",       Icon: Bus,               defaultCost: 1.55 },
  { id: "moto", label: "Moto",      Icon: Motorcycle,        defaultCost: 0.70 },
  { id: "car",  label: "Coche",     Icon: Car,               defaultCost: 1.80 },
] as const

type ModeId = typeof MODES[number]["id"]

interface RouteOptimizerProps {
  analysis: Analysis
  costPerVisit: number
  onCostChange: (v: number) => void
}

export function RouteOptimizer({ analysis, costPerVisit, onCostChange }: RouteOptimizerProps) {
  const { productStats, supermarkets, optimalTotal, cheapestWins } = analysis

  const [modeId, setModeId] = useState<ModeId>("car")

  function handleModeChange(id: ModeId) {
    const mode = MODES.find((m) => m.id === id)!
    setModeId(id)
    onCostChange(mode.defaultCost)
  }

  // Number of stores used in the pure optimal basket
  const pureOptimalStoreCount = supermarkets.filter((sm) => (cheapestWins[sm] ?? 0) > 0).length

  const results = useMemo(() => {
    const n = supermarkets.length

    // Brute-force all non-empty subsets of stores
    let bestTotal = Infinity
    let bestStores: string[] = []
    let bestBasketCost = 0
    let bestTravelCost = 0

    for (let mask = 1; mask < (1 << n); mask++) {
      const stores = supermarkets.filter((_, i) => (mask >> i) & 1)

      let basketCost = 0
      for (const p of productStats) {
        const available = stores
          .map((sm) => p.prices[sm])
          .filter((price): price is number => price !== null)
        // If product unavailable in this subset, fall back to global cheapest
        basketCost += available.length > 0 ? Math.min(...available) : p.min
      }

      const travelCost = stores.length * costPerVisit
      const total = basketCost + travelCost

      if (total < bestTotal) {
        bestTotal = total
        bestStores = stores
        bestBasketCost = basketCost
        bestTravelCost = travelCost
      }
    }

    // Best single store (1 visit)
    const singleOptions = supermarkets
      .map((sm) => {
        let basket = 0
        for (const p of productStats) {
          basket += p.prices[sm] ?? p.min
        }
        return { sm, basketCost: basket, total: basket + costPerVisit }
      })
      .sort((a, b) => a.total - b.total)

    const bestSingle = singleOptions[0]

    const savingsVsSingle = bestSingle.total - bestTotal
    const savingsVsPureOptimal = bestTotal - (optimalTotal + pureOptimalStoreCount * costPerVisit)

    return {
      optimal: {
        stores: bestStores,
        basketCost: bestBasketCost,
        travelCost: bestTravelCost,
        total: bestTotal,
      },
      single: bestSingle,
      savingsVsSingle,
      savingsVsPureOptimal,
    }
  }, [productStats, supermarkets, costPerVisit, optimalTotal, pureOptimalStoreCount])

  const pureTotal = optimalTotal + pureOptimalStoreCount * costPerVisit
  const routeIsSingleStore = results.optimal.stores.length === 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <span>🗺️</span>
          <span>Ahorro por ruta</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">

        {/* Transport mode + cost */}
        <div className="flex flex-wrap items-center gap-3">
          <ButtonGroup>
            {MODES.map(({ id, label, Icon }) => (
              <Button
                key={id}
                variant={modeId === id ? "default" : "outline"}
                size="sm"
                title={label}
                onClick={() => handleModeChange(id)}
                className="gap-1.5"
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </ButtonGroup>

          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Coste por visita:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
              <Input
                type="number"
                min={0}
                step={0.05}
                value={costPerVisit}
                onChange={(e) => onCostChange(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 pl-6"
              />
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="rounded-lg ring-1 ring-foreground/10 overflow-hidden text-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left px-4 py-2 font-medium">Escenario</th>
                <th className="text-right px-4 py-2 font-medium">Tiendas</th>
                <th className="text-right px-4 py-2 font-medium">Cesta</th>
                <th className="text-right px-4 py-2 font-medium">Viaje</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Pure optimal row */}
              <tr className="text-muted-foreground">
                <td className="px-4 py-2">
                  Cesta óptima{" "}
                  <span className="text-xs">(sin coste de viaje)</span>
                </td>
                <td className="text-right px-4 py-2 tabular-nums">{pureOptimalStoreCount}</td>
                <td className="text-right px-4 py-2 tabular-nums">{fmt.format(optimalTotal)}</td>
                <td className="text-right px-4 py-2 tabular-nums">—</td>
                <td className="text-right px-4 py-2 tabular-nums">{fmt.format(optimalTotal)}</td>
              </tr>

              {/* Route-optimal row */}
              <tr className="bg-primary/5">
                <td className="px-4 py-2">
                  <span className="font-semibold">Ruta óptima</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {results.optimal.stores.map((sm) => (
                      <Badge key={sm} variant="outline" className="text-xs">{sm}</Badge>
                    ))}
                  </div>
                </td>
                <td className="text-right px-4 py-2 tabular-nums font-semibold">
                  {results.optimal.stores.length}
                </td>
                <td className="text-right px-4 py-2 tabular-nums">{fmt.format(results.optimal.basketCost)}</td>
                <td className="text-right px-4 py-2 tabular-nums">{fmt.format(results.optimal.travelCost)}</td>
                <td className="text-right px-4 py-2 tabular-nums font-bold text-primary">
                  {fmt.format(results.optimal.total)}
                </td>
              </tr>

              {/* Best single store row */}
              <tr className="text-muted-foreground">
                <td className="px-4 py-2">
                  Mejor tienda única{" "}
                  <Badge variant="outline" className="ml-1 text-xs">{results.single.sm}</Badge>
                </td>
                <td className="text-right px-4 py-2 tabular-nums">1</td>
                <td className="text-right px-4 py-2 tabular-nums">{fmt.format(results.single.basketCost)}</td>
                <td className="text-right px-4 py-2 tabular-nums">{fmt.format(costPerVisit)}</td>
                <td className="text-right px-4 py-2 tabular-nums">{fmt.format(results.single.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary callout */}
        {routeIsSingleStore ? (
          <p className="text-sm text-muted-foreground">
            Con este coste de desplazamiento, comprar todo en{" "}
            <span className="font-medium text-foreground">{results.optimal.stores[0]}</span> es la
            opción más económica — no vale la pena dividir la compra.
          </p>
        ) : results.savingsVsSingle > 0.01 ? (
          <p className="text-sm">
            Siguiendo la ruta óptima ahorras{" "}
            <span className="font-bold text-primary">{fmt.format(results.savingsVsSingle)}</span>{" "}
            vs ir solo a <span className="font-medium">{results.single.sm}</span>
            {results.savingsVsPureOptimal > 0.01 && (
              <span className="text-muted-foreground">
                {" "}· pero{" "}
                <span className="text-foreground font-medium">{fmt.format(results.savingsVsPureOptimal)}</span> más
                caro que la cesta óptima sin contar el viaje
              </span>
            )}
            .
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Con este coste de desplazamiento, la ruta óptima y la mejor tienda única tienen un coste
            similar.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
