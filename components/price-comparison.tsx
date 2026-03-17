"use client"

import { useState, useMemo, useEffect, Fragment, type ReactNode } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table"
import { MagnifyingGlass, Faders, DownloadSimple, LinkSimple, CaretRight } from "@phosphor-icons/react"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Analysis, ProductStat } from "@/lib/parse-csv"

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" })

interface PriceComparisonProps {
  analysis: Analysis
  costPerVisit?: number
  routeOptimizerSlot?: ReactNode
}

export function PriceComparison({ analysis, costPerVisit = 0, routeOptimizerSlot }: PriceComparisonProps) {
  const { supermarkets, categories, productStats, optimalTotal, rankedStats } = analysis

  // Row selection (shopping list)
  const [checkedProducts, setCheckedProducts] = useState<Set<string>>(new Set())
  // Supermarket filter for shopping list
  const [activeSupermarkets, setActiveSupermarkets] = useState<Set<string>>(
    new Set(supermarkets)
  )
  // TanStack column filters (product name search)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  // TanStack column visibility (show/hide supermarket columns)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  // Category filter (null = all)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  // Collapsed category groups
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  // Savings threshold value and mode
  const [threshold, setThreshold] = useState(0)
  const [thresholdMode, setThresholdMode] = useState<"eur" | "pct">("eur")
  // Top savings section expand toggle
  const [showAllSavings, setShowAllSavings] = useState(false)
  // Share link feedback
  const [linkCopied, setLinkCopied] = useState(false)

  // Data filtered by active category (before TanStack name filter)
  const filteredData = useMemo(
    () => activeCategory ? productStats.filter((p) => p.category === activeCategory) : productStats,
    [productStats, activeCategory]
  )

  const allChecked = filteredData.length > 0 && filteredData.every((p) => checkedProducts.has(p.name))
  const someChecked = filteredData.some((p) => checkedProducts.has(p.name)) && !allChecked

  // Restore selection from URL on mount (share link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const lista = params.get("lista")
    if (!lista) return
    const names = lista.split(",").map(decodeURIComponent).filter((n) =>
      productStats.some((p) => p.name === n)
    )
    if (names.length > 0) setCheckedProducts(new Set(names))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleAllProducts() {
    if (allChecked) {
      setCheckedProducts((prev) => {
        const next = new Set(prev)
        filteredData.forEach((p) => next.delete(p.name))
        return next
      })
    } else {
      setCheckedProducts((prev) => {
        const next = new Set(prev)
        filteredData.forEach((p) => next.add(p.name))
        return next
      })
    }
  }

  function toggleProduct(name: string) {
    setCheckedProducts((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function toggleSupermarket(sm: string) {
    setActiveSupermarkets((prev) => {
      if (prev.size === 1 && prev.has(sm)) return prev
      const next = new Set(prev)
      next.has(sm) ? next.delete(sm) : next.add(sm)
      return next
    })
  }

  function toggleCategoryCollapse(cat: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function isBelowThreshold(p: ProductStat): boolean {
    if (threshold <= 0) return false
    const diff = p.max - p.min
    if (thresholdMode === "pct") {
      const pct = p.min > 0 ? (diff / p.min) * 100 : 0
      return pct < threshold
    }
    return diff < threshold
  }

  // Build columns dynamically from supermarkets
  const columns = useMemo<ColumnDef<ProductStat>[]>(() => [
    {
      id: "select",
      enableHiding: false,
      header: () => (
        <Checkbox
          checked={allChecked}
          data-indeterminate={someChecked ? true : undefined}
          onCheckedChange={toggleAllProducts}
          aria-label="Seleccionar todos"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={checkedProducts.has(row.original.name)}
          onCheckedChange={() => toggleProduct(row.original.name)}
          aria-label={`Seleccionar ${row.original.name}`}
        />
      ),
      size: 24,
    },
    {
      accessorKey: "name",
      id: "name",
      enableHiding: false,
      header: "Producto",
      filterFn: "includesString",
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: "unit",
      id: "unit",
      header: () => <div className="w-[30px] max-w-[30px] overflow-hidden text-ellipsis">Ud.</div>,
      cell: ({ getValue }) => (
        <div className="w-[30px] max-w-[30px] overflow-hidden text-ellipsis text-muted-foreground">
          {getValue<string>()}
        </div>
      ),
    },
    ...supermarkets.map<ColumnDef<ProductStat>>((sm) => ({
      id: sm,
      header: sm,
      accessorFn: (row) => row.prices[sm],
      cell: ({ row }) => {
        const price = row.original.prices[sm]
        const isCheapest = price !== null && price === row.original.min
        const isMostExp = price !== null && price === row.original.max && row.original.min !== row.original.max
        return (
          <span
            className={[
              "tabular-nums block w-full rounded px-1 py-0.5",
              isCheapest ? "bg-green-100 font-semibold text-green-800 dark:bg-green-900/60 dark:text-green-300" : "",
              isMostExp ? "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300" : "",
            ].filter(Boolean).join(" ")}
          >
            {price === null ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              fmt.format(price)
            )}
          </span>
        )
      },
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [supermarkets, checkedProducts, allChecked, someChecked])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnFilters, columnVisibility },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // Shopping list derived from checked products + active supermarkets
  // When costPerVisit > 0, brute-forces the optimal store subset to minimise basket + travel
  const shoppingList = useMemo(() => {
    if (checkedProducts.size === 0) return []
    const selected = productStats.filter((p) => checkedProducts.has(p.name))
    const activeSmsArr = supermarkets.filter((sm) => activeSupermarkets.has(sm))

    if (costPerVisit <= 0 || activeSmsArr.length === 0) {
      return selected.map((p) => {
        const entries = activeSmsArr
          .filter((sm) => p.prices[sm] !== null)
          .map((sm) => ({ sm, price: p.prices[sm] as number }))
          .sort((a, b) => a.price - b.price)
        if (entries.length === 0) return { product: p, sm: null, price: null }
        return { product: p, sm: entries[0].sm, price: entries[0].price }
      })
    }

    // Brute-force best subset of activeSupermarkets for this selection
    const n = activeSmsArr.length
    let bestTotal = Infinity
    let bestStores: string[] = []
    for (let mask = 1; mask < (1 << n); mask++) {
      const stores = activeSmsArr.filter((_, i) => (mask >> i) & 1)
      let basket = 0
      for (const p of selected) {
        const prices = stores
          .map((sm) => p.prices[sm])
          .filter((v): v is number => v !== null)
        basket += prices.length > 0 ? Math.min(...prices) : p.min
      }
      const total = basket + stores.length * costPerVisit
      if (total < bestTotal) { bestTotal = total; bestStores = stores }
    }

    return selected.map((p) => {
      const entries = bestStores
        .map((sm) => ({ sm, price: p.prices[sm] }))
        .filter((e): e is { sm: string; price: number } => e.price !== null)
        .sort((a, b) => a.price - b.price)
      if (entries.length === 0) {
        const fallback = activeSmsArr
          .map((sm) => ({ sm, price: p.prices[sm] }))
          .filter((e): e is { sm: string; price: number } => e.price !== null)
          .sort((a, b) => a.price - b.price)[0]
        return fallback ? { product: p, sm: fallback.sm, price: fallback.price } : { product: p, sm: null, price: null }
      }
      return { product: p, sm: entries[0].sm, price: entries[0].price }
    })
  }, [checkedProducts, productStats, supermarkets, activeSupermarkets, costPerVisit])

  const shoppingTotal = useMemo(
    () => shoppingList.reduce((sum, item) => sum + (item.price ?? 0), 0),
    [shoppingList]
  )

  // Shopping list grouped by supermarket (in CSV order)
  const shoppingBySm = useMemo(() => {
    const map: Record<string, Array<{ name: string; unit: string; price: number }>> = {}
    const unavailable: string[] = []
    for (const { product, sm, price } of shoppingList) {
      if (!sm || price === null) { unavailable.push(product.name); continue }
      if (!map[sm]) map[sm] = []
      map[sm].push({ name: product.name, unit: product.unit, price })
    }
    const entries = supermarkets
      .filter((sm) => map[sm]?.length > 0)
      .map((sm) => ({ sm, items: map[sm] }))
    return { entries, unavailable }
  }, [shoppingList, supermarkets])

  // Best single supermarket for the current shopping list selection (for savings callout)
  const singleBestForList = useMemo(() => {
    if (checkedProducts.size === 0) return null
    const selected = productStats.filter((p) => checkedProducts.has(p.name))
    const activeSmsArr = supermarkets.filter((sm) => activeSupermarkets.has(sm))
    if (activeSmsArr.length === 0) return null
    return activeSmsArr
      .map((sm) => {
        const basket = selected.reduce((sum, p) => sum + (p.prices[sm] ?? p.min), 0)
        return { sm, total: basket + costPerVisit }
      })
      .sort((a, b) => a.total - b.total)[0]
  }, [checkedProducts, productStats, supermarkets, activeSupermarkets, costPerVisit])

  // Products sorted by price gap (max - min), largest saving first
  const topSavings = useMemo(
    () =>
      productStats
        .filter((p) => p.max !== p.min)
        .map((p) => ({
          ...p,
          mostExpSms: supermarkets.filter((sm) => p.prices[sm] === p.max),
          saving: p.max - p.min,
          savingPct: ((p.max - p.min) / p.min) * 100,
        }))
        .sort((a, b) => b.saving - a.saving),
    [productStats, supermarkets]
  )

  // Filter savings by active category
  const visibleSavings = useMemo(
    () => activeCategory ? topSavings.filter((p) => p.category === activeCategory) : topSavings,
    [topSavings, activeCategory]
  )

  function downloadShoppingList() {
    const bySm: Record<string, Array<{ name: string; unit: string; price: number }>> = {}
    const unavailable: string[] = []
    for (const { product, sm, price } of shoppingList) {
      if (!sm || price === null) { unavailable.push(product.name); continue }
      if (!bySm[sm]) bySm[sm] = []
      bySm[sm].push({ name: product.name, unit: product.unit, price })
    }
    const lines: string[] = ["LISTA DE LA COMPRA", "==================", ""]
    for (const [sm, items] of Object.entries(bySm)) {
      lines.push(sm)
      lines.push("-".repeat(sm.length))
      for (const item of items) {
        const label = item.unit ? `${item.name} (${item.unit})` : item.name
        lines.push(`  ${label.padEnd(42)} ${fmt.format(item.price)}`)
      }
      const smTotal = items.reduce((s, i) => s + i.price, 0)
      lines.push(`  ${"Subtotal".padEnd(42)} ${fmt.format(smTotal)}`)
      lines.push("")
    }
    if (unavailable.length > 0) {
      lines.push("NO DISPONIBLE EN TIENDAS SELECCIONADAS")
      for (const name of unavailable) lines.push(`  - ${name}`)
      lines.push("")
    }
    if (costPerVisit > 0 && Object.keys(bySm).length > 0) {
      const storeCount = Object.keys(bySm).length
      lines.push(`${"Viaje (" + storeCount + " tiendas)".padEnd(44)} ${fmt.format(storeCount * costPerVisit)}`)
    }
    const travelCost = costPerVisit > 0 ? Object.keys(bySm).length * costPerVisit : 0
    lines.push(`${"TOTAL".padEnd(44)} ${fmt.format(shoppingTotal + travelCost)}`)
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "lista-compra.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function copyShareLink() {
    const encoded = [...checkedProducts].map(encodeURIComponent).join(",")
    const url = new URL(window.location.href)
    url.searchParams.set("lista", encoded)
    navigator.clipboard.writeText(url.toString()).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  // Shared row renderer for both flat and grouped modes
  function renderRow(row: ReturnType<typeof table.getRowModel>["rows"][number]) {
    return (
      <TableRow
        key={row.id}
        className={[
          "cursor-pointer",
          checkedProducts.has(row.original.name) ? "bg-primary/5" : "",
          isBelowThreshold(row.original) ? "opacity-20" : "",
        ].filter(Boolean).join(" ")}
        onClick={() => toggleProduct(row.original.name)}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell
            key={cell.id}
            className={
              cell.column.id !== "select" && cell.column.id !== "name" && cell.column.id !== "unit"
                ? "text-right"
                : ""
            }
            style={cell.column.id === "select" ? { width: 24, paddingRight: 0 } : undefined}
            onClick={cell.column.id === "select" ? (e) => e.stopPropagation() : undefined}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Savings banner */}
      {rankedStats.length > 0 && (
        <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm">
          <span className="font-medium">Ahorro potencial: </span>
          Cesta óptima{" "}
          <span className="font-bold text-primary">{fmt.format(optimalTotal)}</span>{" "}
          vs mejor supermercado único{" "}
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

        {/* Toolbar row 1: search + threshold + columns */}
        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <Input
              placeholder="Filtrar productos…"
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn("name")?.setFilterValue(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Umbral ahorro:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {thresholdMode === "eur" ? "€" : "%"}
              </span>
              <Input
                type="number"
                min={0}
                step={thresholdMode === "eur" ? 0.05 : 1}
                value={threshold === 0 ? "" : threshold}
                placeholder="0"
                onChange={(e) => setThreshold(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-20 pl-6"
              />
            </div>
            <ButtonGroup>
              <Button
                variant={thresholdMode === "eur" ? "default" : "outline"}
                size="sm"
                onClick={() => { setThresholdMode("eur"); setThreshold(0) }}
              >
                €
              </Button>
              <Button
                variant={thresholdMode === "pct" ? "default" : "outline"}
                size="sm"
                onClick={() => { setThresholdMode("pct"); setThreshold(0) }}
              >
                %
              </Button>
            </ButtonGroup>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground">
              <Faders size={15} />
              Columnas
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Mostrar supermercados</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((col) => col.getCanHide())
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={col.getIsVisible()}
                      onCheckedChange={(value) => col.toggleVisibility(!!value)}
                    >
                      {col.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Toolbar row 2: category pills */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={[
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeCategory === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeCategory === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              ].join(" ")}
            >
              {cat}
            </button>
          ))}
        </div>

        {threshold > 0 && (() => {
          const dimmedCount = table.getRowModel().rows.filter((r) => isBelowThreshold(r.original)).length
          return dimmedCount > 0 ? (
            <p className="mb-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{dimmedCount}</span>{" "}
              {dimmedCount === 1 ? "producto" : "productos"} con ahorro &lt;{" "}
              {thresholdMode === "eur" ? fmt.format(threshold) : `${threshold}%`} aparecen atenuados.
            </p>
          ) : null
        })()}

        <div className="rounded-xl ring-1 ring-foreground/10 overflow-auto max-h-[600px] [&_[data-slot=table-container]]:overflow-visible">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-muted">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={[
                        "sticky top-0 z-10 bg-muted",
                        header.id !== "name" ? "text-right" : "",
                      ].filter(Boolean).join(" ")}
                      style={header.id === "select" ? { width: 24, paddingRight: 0 } : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">
                    Sin resultados.
                  </TableCell>
                </TableRow>
              ) : activeCategory !== null ? (
                // Flat rendering when a specific category is selected
                table.getRowModel().rows.map((row) => renderRow(row))
              ) : (
                // Grouped rendering when showing all categories
                categories.map((cat) => {
                  const catRows = table.getRowModel().rows.filter((r) => r.original.category === cat)
                  if (catRows.length === 0) return null
                  const isCollapsed = collapsedCategories.has(cat)
                  return (
                    <Fragment key={cat}>
                      <TableRow
                        className="bg-muted/60 cursor-pointer select-none hover:bg-muted/80"
                        onClick={() => toggleCategoryCollapse(cat)}
                      >
                        <TableCell colSpan={columns.length} className="py-2">
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            <CaretRight
                              size={12}
                              className={`transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                            />
                            {cat}
                            <span className="font-normal text-muted-foreground">({catRows.length})</span>
                          </span>
                        </TableCell>
                      </TableRow>
                      {!isCollapsed && catRows.map((row) => renderRow(row))}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell className="font-medium">Total cesta completa</TableCell>
                <TableCell />
                {supermarkets
                  .filter((sm) => table.getColumn(sm)?.getIsVisible() !== false)
                  .map((sm) => {
                    const stat = analysis.smStats.find((s) => s.sm === sm)
                    if (!stat) return <TableCell key={sm} />
                    return (
                      <TableCell key={sm} className="text-right">
                        {fmt.format(stat.fullBasketTotal)}
                      </TableCell>
                    )
                  })}
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {table.getFilteredRowModel().rows.length < filteredData.length && (
          <p className="mt-2 text-xs text-muted-foreground">
            Mostrando {table.getFilteredRowModel().rows.length} de {filteredData.length} productos
          </p>
        )}
      </div>

      {/* Mayores ahorros potenciales */}
      {visibleSavings.length > 0 && (
        <div>
          <h2 className="mb-3 text-xl font-semibold">Mayores ahorros potenciales</h2>
          <div className="rounded-xl ring-1 ring-foreground/10">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Más barato</TableHead>
                  <TableHead className="text-right">Más caro</TableHead>
                  <TableHead className="text-right">Ahorro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showAllSavings ? visibleSavings : visibleSavings.slice(0, 10)).map((p) => (
                  <TableRow
                    key={p.name}
                    className={isBelowThreshold(p) ? "opacity-20" : ""}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">
                      <span className="tabular-nums inline-block rounded px-1 py-0.5 bg-green-100 font-semibold text-green-800 dark:bg-green-900/60 dark:text-green-300">
                        {p.cheapestSms.join(", ")} — {fmt.format(p.min)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="tabular-nums inline-block rounded px-1 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300">
                        {p.mostExpSms.join(", ")} — {fmt.format(p.max)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="font-semibold">{fmt.format(p.saving)}</span>
                      <span className="ml-1 text-xs text-muted-foreground">({p.savingPct.toFixed(0)}%)</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {visibleSavings.length > 10 && (
            <button
              onClick={() => setShowAllSavings((v) => !v)}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {showAllSavings ? "Ver menos" : `Ver todos (${visibleSavings.length} productos)`}
            </button>
          )}
        </div>
      )}

      {/* Route optimizer slot — rendered just above the shopping list */}
      {checkedProducts.size > 0 && routeOptimizerSlot}

      {/* Shopping List */}
      {checkedProducts.size > 0 && (
        <div className="flex flex-col gap-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
              <span>🛒 Lista de la compra ({checkedProducts.size} productos)</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={downloadShoppingList} className="gap-1.5">
                  <DownloadSimple size={14} />
                  Exportar
                </Button>
                <Button variant="ghost" size="sm" onClick={copyShareLink} className="gap-1.5">
                  <LinkSimple size={14} />
                  {linkCopied ? "¡Copiado!" : "Compartir"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCheckedProducts(new Set())}>
                  Limpiar
                </Button>
              </div>
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

            {/* Shopping list grouped by supermarket */}
            <div className="rounded-lg ring-1 ring-foreground/10 divide-y divide-border overflow-hidden">
              {shoppingBySm.entries.map(({ sm, items }) => {
                const smTotal = items.reduce((s, i) => s + i.price, 0)
                return (
                  <div key={sm}>
                    <div className="bg-muted/40 px-4 py-2">
                      <span className="text-sm font-semibold">{sm}</span>
                    </div>
                    <div className="px-4 py-2 flex flex-col gap-1">
                      {items.map((item) => (
                        <div key={item.name} className="flex items-baseline justify-between gap-4 text-sm">
                          <span>
                            {item.name}
                            {item.unit && (
                              <span className="ml-1 text-xs text-muted-foreground">({item.unit})</span>
                            )}
                          </span>
                          <span className="tabular-nums shrink-0">{fmt.format(item.price)}</span>
                        </div>
                      ))}
                      <div className="flex items-baseline justify-between gap-4 border-t border-border pt-1 mt-0.5 text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="tabular-nums font-medium shrink-0">{fmt.format(smTotal)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {shoppingBySm.unavailable.length > 0 && (
                <div>
                  <div className="bg-muted/40 px-4 py-2">
                    <span className="text-sm font-semibold text-muted-foreground">No disponible en tiendas seleccionadas</span>
                  </div>
                  <div className="px-4 py-2 flex flex-col gap-1">
                    {shoppingBySm.unavailable.map((name) => (
                      <p key={name} className="text-sm text-muted-foreground">{name}</p>
                    ))}
                  </div>
                </div>
              )}

              {costPerVisit > 0 && shoppingBySm.entries.length > 0 && (
                <div className="flex items-baseline justify-between gap-4 px-4 py-2 text-sm text-muted-foreground">
                  <span>
                    Viaje ({shoppingBySm.entries.length}{" "}
                    {shoppingBySm.entries.length === 1 ? "tienda" : "tiendas"} × {fmt.format(costPerVisit)})
                  </span>
                  <span className="tabular-nums shrink-0">
                    {fmt.format(shoppingBySm.entries.length * costPerVisit)}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 px-4 py-3 text-sm font-semibold">
                <span>Total{costPerVisit > 0 ? " (con viaje)" : ""}</span>
                <span className="tabular-nums">
                  {fmt.format(shoppingTotal + (costPerVisit > 0 ? shoppingBySm.entries.length * costPerVisit : 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {(() => {
          if (!singleBestForList) return null
          const travelCost = costPerVisit > 0 ? shoppingBySm.entries.length * costPerVisit : 0
          const optimalTotal = shoppingTotal + travelCost
          const savings = singleBestForList.total - optimalTotal
          if (savings <= 0.01) return null
          return (
            <p className="text-sm px-1">
              Ahorras{" "}
              <span className="font-bold text-primary">{fmt.format(savings)}</span>{" "}
              vs comprar todo en{" "}
              <span className="font-medium">{singleBestForList.sm}</span>
              {costPerVisit > 0 && (
                <span className="text-muted-foreground"> (viaje incluido)</span>
              )}
            </p>
          )
        })()}
        </div>
      )}
    </div>
  )
}
