import type {
  Analysis,
  CategoryStat,
  ProductStat,
  SmStat,
} from "./parse-csv"

export interface PriceRow {
  productName: string
  category: string
  unit: string
  supermarket: string
  price: number | null
}

/**
 * Builds the same Analysis object as parseCsv, but from structured DB rows
 * instead of CSV text. Zero component changes needed — output type is identical.
 */
export function buildAnalysis(rows: PriceRow[]): Analysis {
  if (rows.length === 0) {
    return {
      supermarkets: [],
      categories: [],
      categoryStats: [],
      productStats: [],
      totalItems: 0,
      optimalTotal: 0,
      smStats: [],
      rankedStats: [],
      cheapestWins: {},
      mostCheapest: [],
      maxWins: 0,
      priciest: {},
      mostExpensive: [],
      maxExpensive: 0,
    }
  }

  // Collect ordered supermarkets (preserve DB ordering — seeded in CSV column order)
  const supermarketsOrdered: string[] = []
  const seenSm = new Set<string>()
  for (const row of rows) {
    if (!seenSm.has(row.supermarket)) {
      seenSm.add(row.supermarket)
      supermarketsOrdered.push(row.supermarket)
    }
  }

  // Pivot rows into per-product price maps
  const productMap = new Map<
    string,
    { category: string; unit: string; prices: Record<string, number | null> }
  >()

  for (const row of rows) {
    if (!productMap.has(row.productName)) {
      const prices: Record<string, number | null> = {}
      for (const sm of supermarketsOrdered) prices[sm] = null
      productMap.set(row.productName, {
        category: row.category,
        unit: row.unit,
        prices,
      })
    }
    productMap.get(row.productName)!.prices[row.supermarket] = row.price
  }

  // Build ProductStat[]
  const productStats: ProductStat[] = []
  for (const [name, { category, unit, prices }] of productMap) {
    const validPrices = Object.values(prices).filter(
      (p): p is number => p !== null,
    )
    if (validPrices.length === 0) continue

    const min = Math.min(...validPrices)
    const max = Math.max(...validPrices)
    const cheapestSms = supermarketsOrdered.filter((sm) => prices[sm] === min)

    productStats.push({ name, category, unit, prices, min, max, cheapestSms })
  }

  const categories = [
    ...new Set(productStats.map((p) => p.category)),
  ].filter(Boolean).sort()

  const totalItems = productStats.length
  const optimalTotal = productStats.reduce((sum, p) => sum + p.min, 0)

  // Cheapest wins
  const cheapestWins: Record<string, number> = {}
  for (const sm of supermarketsOrdered) cheapestWins[sm] = 0
  for (const p of productStats) {
    for (const sm of p.cheapestSms) {
      cheapestWins[sm] = (cheapestWins[sm] ?? 0) + 1
    }
  }

  const mostCheapest = supermarketsOrdered
    .map((sm) => ({ sm, wins: cheapestWins[sm] ?? 0 }))
    .sort((a, b) => b.wins - a.wins)

  const maxWins = mostCheapest[0]?.wins ?? 0

  // Priciest
  const priciest: Record<string, number> = {}
  for (const sm of supermarketsOrdered) priciest[sm] = 0
  for (const p of productStats) {
    if (p.min === p.max) continue
    const priSms = supermarketsOrdered.filter((sm) => p.prices[sm] === p.max)
    for (const sm of priSms) priciest[sm] = (priciest[sm] ?? 0) + 1
  }
  const mostExpensive = supermarketsOrdered
    .map((sm) => ({ sm, count: priciest[sm] ?? 0 }))
    .sort((a, b) => b.count - a.count)
  const maxExpensive = mostExpensive[0]?.count ?? 0

  // SM stats
  const smStats: SmStat[] = supermarketsOrdered.map((sm) => {
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
    const extraPct =
      optimalTotal > 0 ? (extraVsOptimal / optimalTotal) * 100 : 0

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
    for (const sm of supermarketsOrdered) {
      totals[sm] = catProducts.reduce(
        (sum, p) => sum + (p.prices[sm] ?? p.min),
        0,
      )
    }

    const totalValues = Object.values(totals)
    const minTotal = Math.min(...totalValues)
    const maxTotal = Math.max(...totalValues)
    const cheapestSms = supermarketsOrdered.filter(
      (sm) => totals[sm] === minTotal,
    )

    const categoryWins: Record<string, number> = {}
    for (const sm of supermarketsOrdered) categoryWins[sm] = 0
    for (const p of catProducts) {
      for (const sm of p.cheapestSms) {
        categoryWins[sm] = (categoryWins[sm] ?? 0) + 1
      }
    }

    return {
      category: cat,
      productCount: catProducts.length,
      totals,
      minTotal,
      maxTotal,
      cheapestSms,
      categoryWins,
    }
  })

  return {
    supermarkets: supermarketsOrdered,
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
