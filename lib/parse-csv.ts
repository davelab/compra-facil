import Papa from "papaparse"

export interface ProductStat {
  name: string
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

export interface Analysis {
  supermarkets: string[]
  productStats: ProductStat[]
  totalItems: number
  optimalTotal: number
  smStats: SmStat[]
  rankedStats: SmStat[]
  cheapestWins: Record<string, number>
  mostCheapest: Array<{ sm: string; wins: number }>
  maxWins: number
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

  // First row is header: ["", "Unitad", "BonArea", "Mercadona", ...]
  const header = rows[0]
  const supermarkets = header.slice(2).filter((s) => s.trim() !== "")

  const productStats: ProductStat[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const name = row[0]?.trim()
    const unit = row[1]?.trim() ?? ""

    if (!name) continue

    const prices: Record<string, number | null> = {}
    for (let j = 0; j < supermarkets.length; j++) {
      const sm = supermarkets[j]
      prices[sm] = parsePrice(row[j + 2])
    }

    // Only include products with at least one price
    const validPrices = Object.values(prices).filter(
      (p): p is number => p !== null
    )
    if (validPrices.length === 0) continue

    const min = Math.min(...validPrices)
    const max = Math.max(...validPrices)
    const cheapestSms = supermarkets.filter((sm) => prices[sm] === min)

    productStats.push({ name, unit, prices, min, max, cheapestSms })
  }

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
    .sort((a, b) => {
      if (a.missing !== b.missing) return a.missing - b.missing
      return a.fullBasketTotal - b.fullBasketTotal
    })

  return {
    supermarkets,
    productStats,
    totalItems,
    optimalTotal,
    smStats,
    rankedStats,
    cheapestWins,
    mostCheapest,
    maxWins,
  }
}
