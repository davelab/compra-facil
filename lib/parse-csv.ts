import Papa from "papaparse"

export interface ProductStat {
  name: string
  category: string
  unit: string
  prices: Record<string, number | null>
  min: number
  max: number
  cheapestSms: string[]
}

export interface SmStat {
  sm: string
  carriedTotal: number
  carriedCount: number
  missing: number
  fullBasketTotal: number
  extraVsOptimal: number
  extraPct: number
}

export interface CategoryStat {
  category: string
  productCount: number
  totals: Record<string, number>  // full-basket total per SM for this category
  minTotal: number
  maxTotal: number
  cheapestSms: string[]          // SMs tied for lowest total
  categoryWins: Record<string, number> // cheapest-product wins per SM within category
}

export interface Analysis {
  supermarkets: string[]
  categories: string[]
  categoryStats: CategoryStat[]
  productStats: ProductStat[]
  totalItems: number
  optimalTotal: number
  smStats: SmStat[]
  rankedStats: SmStat[]
  cheapestWins: Record<string, number>
  mostCheapest: Array<{ sm: string; wins: number }>
  maxWins: number
  priciest: Record<string, number>
  mostExpensive: Array<{ sm: string; count: number }>
  maxExpensive: number
}

export function parsePrice(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null
  const cleaned = raw.replace(/€/g, "").replace(/\s/g, "")
  if (cleaned === "" || cleaned === "/" || cleaned === "-") return null
  const normalized = cleaned.replace(",", ".")
  const num = parseFloat(normalized)
  return isNaN(num) ? null : num
}

export function parseCsv(csvText: string): Analysis {
  const result = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  })

  const rows = result.data as string[][]

  // First row is header: ["", "Categoría", "Unitad", "BonArea", "Mercadona", ...]
  const header = rows[0]
  const supermarkets = header.slice(3).filter((s) => s.trim() !== "")

  const productStats: ProductStat[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const name = row[0]?.trim()
    const category = row[1]?.trim() ?? ""
    const unit = row[2]?.trim() ?? ""

    if (!name) continue

    const prices: Record<string, number | null> = {}
    for (let j = 0; j < supermarkets.length; j++) {
      const sm = supermarkets[j]
      prices[sm] = parsePrice(row[j + 3])
    }

    // Only include products with at least one price
    const validPrices = Object.values(prices).filter(
      (p): p is number => p !== null
    )
    if (validPrices.length === 0) continue

    const min = Math.min(...validPrices)
    const max = Math.max(...validPrices)
    const cheapestSms = supermarkets.filter((sm) => prices[sm] === min)

    productStats.push({ name, category, unit, prices, min, max, cheapestSms })
  }

  const categories = [...new Set(productStats.map((p) => p.category))].filter(Boolean).sort()

  const totalItems = productStats.length
  const optimalTotal = productStats.reduce((sum, p) => sum + p.min, 0)

  // Cheapest wins: count products where each SM is among cheapestSms
  const cheapestWins: Record<string, number> = {}
  for (const sm of supermarkets) {
    cheapestWins[sm] = 0
  }
  for (const p of productStats) {
    for (const sm of p.cheapestSms) {
      cheapestWins[sm] = (cheapestWins[sm] ?? 0) + 1
    }
  }

  const mostCheapest = supermarkets
    .map((sm) => ({ sm, wins: cheapestWins[sm] ?? 0 }))
    .sort((a, b) => b.wins - a.wins)

  const maxWins = mostCheapest[0]?.wins ?? 0

  // Priciest: count products where each SM has the highest price
  const priciest: Record<string, number> = {}
  for (const sm of supermarkets) priciest[sm] = 0
  for (const p of productStats) {
    if (p.min === p.max) continue // all same price, no priciest
    const priSms = supermarkets.filter((sm) => p.prices[sm] === p.max)
    for (const sm of priSms) priciest[sm] = (priciest[sm] ?? 0) + 1
  }
  const mostExpensive = supermarkets
    .map((sm) => ({ sm, count: priciest[sm] ?? 0 }))
    .sort((a, b) => b.count - a.count)
  const maxExpensive = mostExpensive[0]?.count ?? 0

  // SM stats
  const smStats: SmStat[] = supermarkets.map((sm) => {
    let carriedTotal = 0
    let carriedCount = 0
    let missing = 0
    let fullBasketTotal = 0

    for (const p of productStats) {
      const price = p.prices[sm]
      if (price !== null) {
        carriedTotal += price
        carriedCount++
        fullBasketTotal += price
      } else {
        missing++
        fullBasketTotal += p.min
      }
    }

    const extraVsOptimal = fullBasketTotal - optimalTotal
    const extraPct = optimalTotal > 0 ? (extraVsOptimal / optimalTotal) * 100 : 0

    return {
      sm,
      carriedTotal,
      carriedCount,
      missing,
      fullBasketTotal,
      extraVsOptimal,
      extraPct,
    }
  })

  const rankedStats = smStats
    .filter((s) => s.carriedCount > 0)
    .sort((a, b) => a.fullBasketTotal - b.fullBasketTotal)

  // Per-category stats
  const categoryStats: CategoryStat[] = categories.map((cat) => {
    const catProducts = productStats.filter((p) => p.category === cat)

    const totals: Record<string, number> = {}
    for (const sm of supermarkets) {
      totals[sm] = catProducts.reduce((sum, p) => sum + (p.prices[sm] ?? p.min), 0)
    }

    const totalValues = Object.values(totals)
    const minTotal = Math.min(...totalValues)
    const maxTotal = Math.max(...totalValues)
    const cheapestSms = supermarkets.filter((sm) => totals[sm] === minTotal)

    const categoryWins: Record<string, number> = {}
    for (const sm of supermarkets) categoryWins[sm] = 0
    for (const p of catProducts) {
      for (const sm of p.cheapestSms) {
        categoryWins[sm] = (categoryWins[sm] ?? 0) + 1
      }
    }

    return { category: cat, productCount: catProducts.length, totals, minTotal, maxTotal, cheapestSms, categoryWins }
  })

  return {
    supermarkets,
    categories,
    categoryStats,
    productStats,
    totalItems,
    optimalTotal,
    smStats,
    rankedStats,
    cheapestWins,
    mostCheapest,
    maxWins,
    priciest,
    mostExpensive,
    maxExpensive,
  }
}
