"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Analysis } from "@/lib/parse-csv"

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" })

interface PriceComparisonProps {
  analysis: Analysis
}

export function PriceComparison({ analysis }: PriceComparisonProps) {
  const { supermarkets, productStats, optimalTotal, rankedStats } = analysis

  // Checkbox state for products
  const [checkedProducts, setCheckedProducts] = useState<Set<string>>(new Set())
  // Supermarket filter for shopping list
  const [activeSupermarkets, setActiveSupermarkets] = useState<Set<string>>(
    new Set(supermarkets)
  )

  const allChecked =
    productStats.length > 0 && checkedProducts.size === productStats.length
  const someChecked = checkedProducts.size > 0 && !allChecked

  function toggleAllProducts() {
    if (allChecked) {
      setCheckedProducts(new Set())
    } else {
      setCheckedProducts(new Set(productStats.map((p) => p.name)))
    }
  }

  function toggleProduct(name: string) {
    setCheckedProducts((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  function toggleSupermarket(sm: string) {
    setActiveSupermarkets((prev) => {
      if (prev.size === 1 && prev.has(sm)) return prev // keep at least 1
      const next = new Set(prev)
      if (next.has(sm)) {
        next.delete(sm)
      } else {
        next.add(sm)
      }
      return next
    })
  }

  // Footer totals per supermarket
  const footerTotals = useMemo(() => {
    return supermarkets.map((sm) => {
      const stat = analysis.smStats.find((s) => s.sm === sm)
      return stat ? stat.fullBasketTotal : null
    })
  }, [supermarkets, analysis.smStats])

  // Shopping list: checked products, cheapest among active supermarkets
  const shoppingList = useMemo(() => {
    if (checkedProducts.size === 0) return []
    return productStats
      .filter((p) => checkedProducts.has(p.name))
      .map((p) => {
        const activeEntries = supermarkets
          .filter((sm) => activeSupermarkets.has(sm) && p.prices[sm] !== null)
          .map((sm) => ({ sm, price: p.prices[sm] as number }))
          .sort((a, b) => a.price - b.price)

        if (activeEntries.length === 0) {
          return { product: p, sm: null, price: null }
        }
        return { product: p, sm: activeEntries[0].sm, price: activeEntries[0].price }
      })
  }, [checkedProducts, productStats, supermarkets, activeSupermarkets])

  const shoppingTotal = useMemo(
    () => shoppingList.reduce((sum, item) => sum + (item.price ?? 0), 0),
    [shoppingList]
  )

  return (
    <div className="flex flex-col gap-8">
      {/* Savings banner */}
      {rankedStats.length > 0 && (
        <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm">
          <span className="font-medium">Ahorro potencial: </span>
          Cesta óptima{" "}
          <span className="font-bold text-primary">{fmt.format(optimalTotal)}</span> vs mejor
          supermercado único{" "}
          <span className="font-bold">{fmt.format(rankedStats[0].fullBasketTotal)}</span>
          {" — "}ahorro de{" "}
          <span className="font-bold text-primary">
            {fmt.format(rankedStats[0].fullBasketTotal - optimalTotal)}
          </span>{" "}
          comprando en varios supermercados
        </div>
      )}

      {/* Price Table */}
      <div>
        <h2 className="mb-3 text-xl font-semibold">Comparativa de precios</h2>
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-6 px-2 py-2">
                  {/* Select all checkbox */}
                  <Checkbox
                    checked={allChecked}
                    data-indeterminate={someChecked ? true : undefined}
                    onCheckedChange={toggleAllProducts}
                    aria-label="Seleccionar todos"
                  />
                </th>
                <th className="px-3 py-2 text-left font-medium">Producto</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Unidad</th>
                {supermarkets.map((sm) => (
                  <th key={sm} className="px-3 py-2 text-right font-medium">
                    {sm}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productStats.map((p) => (
                <tr
                  key={p.name}
                  className="border-b last:border-0 hover:bg-muted/20"
                  onClick={() => toggleProduct(p.name)}
                  style={{ cursor: "pointer" }}
                >
                  <td
                    className="w-6 px-2 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={checkedProducts.has(p.name)}
                      onCheckedChange={() => toggleProduct(p.name)}
                      aria-label={`Seleccionar ${p.name}`}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.unit}</td>
                  {supermarkets.map((sm) => {
                    const price = p.prices[sm]
                    const isCheapest = price !== null && price === p.min
                    const isMostExp = price !== null && price === p.max && p.min !== p.max
                    return (
                      <td
                        key={sm}
                        className={[
                          "px-3 py-2 text-right tabular-nums",
                          isCheapest
                            ? "bg-green-500/15 font-semibold text-green-700 dark:text-green-400"
                            : "",
                          isMostExp
                            ? "bg-red-500/10 text-red-700 dark:text-red-400"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {price === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          fmt.format(price)
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/40 font-medium">
                <td className="px-2 py-2" />
                <td className="px-3 py-2">Total cesta completa</td>
                <td className="px-3 py-2" />
                {footerTotals.map((total, i) => {
                  const stat = analysis.smStats.find((s) => s.sm === supermarkets[i])
                  if (!stat) return <td key={supermarkets[i]} />
                  const pct = stat.extraPct
                  const isWinner =
                    analysis.rankedStats.length > 0 &&
                    analysis.rankedStats[0].sm === supermarkets[i]
                  return (
                    <td key={supermarkets[i]} className="px-3 py-2 text-right">
                      <div>{total !== null ? fmt.format(total) : "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {stat.missing > 0
                          ? `${stat.missing} completados · `
                          : ""}
                        {isWinner ? (
                          <span className="text-primary">óptimo</span>
                        ) : (
                          `+${pct.toFixed(1)}% vs óptimo`
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Shopping List */}
      {checkedProducts.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>🛒 Lista de la compra ({checkedProducts.size} productos)</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCheckedProducts(new Set())}
              >
                Limpiar selección
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Supermarket filter pills */}
            <div className="flex flex-wrap gap-2">
              <span className="self-center text-sm text-muted-foreground">Tiendas:</span>
              {supermarkets.map((sm) => (
                <button
                  key={sm}
                  onClick={() => toggleSupermarket(sm)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    activeSupermarkets.has(sm)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {sm}
                </button>
              ))}
            </div>

            {/* Shopping list table */}
            <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium">Producto</th>
                    <th className="px-3 py-2 text-left font-medium">Dónde comprar</th>
                    <th className="px-3 py-2 text-right font-medium">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {shoppingList.map(({ product, sm, price }) => (
                    <tr key={product.name} className="border-b last:border-0">
                      <td className="px-3 py-2">{product.name}</td>
                      <td className="px-3 py-2">
                        {sm ? (
                          <Badge variant="outline">{sm}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No disponible en tiendas seleccionadas
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {price !== null ? (
                          fmt.format(price)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/40 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {fmt.format(shoppingTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
