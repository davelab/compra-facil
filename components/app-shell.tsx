"use client"

import { useState, type ReactNode } from "react"
import { RouteOptimizer } from "@/components/route-optimizer"
import { PriceComparison } from "@/components/price-comparison"
import type { Analysis } from "@/lib/parse-csv"

interface AppShellProps {
  analysis: Analysis
  categoryRanking: ReactNode
}

export function AppShell({ analysis, categoryRanking }: AppShellProps) {
  const [costPerVisit, setCostPerVisit] = useState(1.80)

  return (
    <>
      <section className="mb-10">
        <PriceComparison
          analysis={analysis}
          costPerVisit={costPerVisit}
          routeOptimizerSlot={
            <RouteOptimizer
              analysis={analysis}
              costPerVisit={costPerVisit}
              onCostChange={setCostPerVisit}
            />
          }
        />
      </section>

      <section className="mb-10">
        {categoryRanking}
      </section>
    </>
  )
}
