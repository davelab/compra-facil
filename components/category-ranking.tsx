import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Analysis } from "@/lib/parse-csv"

const fmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" })

interface CategoryRankingProps {
  analysis: Analysis
}

export function CategoryRanking({ analysis }: CategoryRankingProps) {
  const { supermarkets, categoryStats } = analysis

  // Category wins per supermarket (how many categories each SM wins)
  const categoryWinsPerSm: Record<string, number> = {}
  for (const sm of supermarkets) categoryWinsPerSm[sm] = 0
  for (const stat of categoryStats) {
    for (const sm of stat.cheapestSms) {
      categoryWinsPerSm[sm] = (categoryWinsPerSm[sm] ?? 0) + 1
    }
  }

  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">Ranking por categoría</h2>
      <div className="rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right text-muted-foreground w-12">Prod.</TableHead>
              {supermarkets.map((sm) => (
                <TableHead key={sm} className="text-right">{sm}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...categoryStats].sort((a, b) => b.productCount - a.productCount).map((stat) => (
              <TableRow key={stat.category}>
                <TableCell className="font-medium">{stat.category}</TableCell>
                <TableCell className="text-right text-muted-foreground tabular-nums text-xs">
                  {stat.productCount}
                </TableCell>
                {supermarkets.map((sm) => {
                  const total = stat.totals[sm]
                  const isCheapest = total === stat.minTotal
                  const isMostExp = total === stat.maxTotal && stat.minTotal !== stat.maxTotal
                  return (
                    <TableCell key={sm} className="text-right">
                      <span
                        className={[
                          "tabular-nums inline-block w-full rounded px-1 py-0.5",
                          isCheapest
                            ? "bg-green-100 font-semibold text-green-800 dark:bg-green-900/60 dark:text-green-300"
                            : "",
                          isMostExp
                            ? "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {fmt.format(total)}
                      </span>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">Categorías más baratas</TableCell>
              <TableCell />
              {supermarkets.map((sm) => (
                <TableCell key={sm} className="text-right tabular-nums">
                  {categoryWinsPerSm[sm] > 0 ? (
                    <span className="font-semibold text-primary">{categoryWinsPerSm[sm]}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Totales por categoría. Productos no disponibles completados al precio más barato de otra tienda.
      </p>
    </div>
  )
}
