# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server with Turbopack (http://localhost:3000)
npm run build        # production build (also validates TypeScript via Next.js)
npm run typecheck    # tsc --noEmit without building
npm run lint         # ESLint
npm run format       # Prettier over all .ts/.tsx files
```

There are no tests. TypeScript and ESLint are the primary correctness gates.

## Architecture

The app is a supermarket price comparison tool called **Cesta Óptima**. It reads a static CSV (`public/data.csv`) and lets users build a filtered shopping list.

### Data flow

```
public/data.csv
  → app/page.tsx (Server Component, fs.readFileSync at build time)
    → lib/parse-csv.ts (parseCsv → Analysis)
      → components/summary-cards.tsx (Server Component, display only)
      → components/price-comparison.tsx ("use client", all interactivity)
```

`page.tsx` reads and parses the CSV synchronously at build time — there is no API route or client fetch. The entire `Analysis` object is serialised as props into the client boundary.

### lib/parse-csv.ts

Single file containing all types and analysis logic:
- `parsePrice` — strips `€`, normalises comma decimals, returns `null` for `/`/`-`/empty
- `parseCsv` — uses PapaParse, builds `ProductStat[]`, then derives `SmStat[]` per supermarket
- **`fullBasketTotal`** on each `SmStat` = own prices + cheapest-available price for missing items (makes totals comparable across stores with different stock coverage)
- **`rankedStats`** sorts by `missing ASC` then `fullBasketTotal ASC` so stores with full coverage always rank above partial ones

### components/price-comparison.tsx

Single large client component holding all interactive state:
- `selectedItems: Set<string>` — product names checked for the shopping list
- `selectedSupermarkets: Set<string>` — filter pills controlling which stores are considered when recommending where to buy
- Shopping list re-derives cheapest store on every render from current `selectedSupermarkets`; items unavailable in all selected stores render a greyed fallback row

### Fonts

- **IBM Plex Mono** — base font for all body text (`--font-sans`)
- **Playfair Display** — headings only (`--font-serif`), applied via `h1–h6` in the base CSS layer

### Styling

- Tailwind CSS v4 with `@import "tailwindcss"` (no `tailwind.config.js`)
- shadcn preset theme — CSS variables are in `app/globals.css` using `oklch()` colours; do not override them
- shadcn components used: `Card`, `Badge`, `Separator`, `Button`, `Checkbox`, `Table`
- `cn()` from `lib/utils.ts` merges Tailwind classes

### CSV format

```
,Unitad,BonArea,Mercadona,Dia,Bon Preu,Consum,Sirena,Aldi
Product name,unit,"€ 5,99","€ 4,95",/,,…
```

Column 0 = product name, column 1 = unit, columns 2+ = one per supermarket. `/` or empty = not available. To update prices, edit `public/data.csv` directly — changes take effect on the next build.
