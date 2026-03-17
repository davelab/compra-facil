# Scaled Architecture

Design for scaling Cesta Óptima beyond a static CSV file — adding persistence,
price history, user accounts, and a cloud DB while staying on free tiers.

---

## Current architecture (as-is)

```
public/data.csv
  └─ app/page.tsx          Server Component — fs.readFileSync at build time
       └─ lib/parse-csv.ts  Parses CSV → Analysis object (in-memory)
            ├─ SummaryCards        Server Component
            └─ AppShell            Client boundary
                 ├─ PriceComparison
                 ├─ CategoryRanking
                 └─ RouteOptimizer
```

**Limitations:**
- Prices update only on redeploy
- No price history (#3 blocked)
- Shopping lists are ephemeral (URL param only)
- Single user, single dataset

---

## Target architecture

### Database — Supabase (free tier)

Chosen for: PostgreSQL + Auth + Storage + Edge Functions in one free plan.
Free tier limits: 500 MB DB · 1 GB file storage · unlimited API requests.

Alternative: **Neon** (serverless Postgres, 0.5 GB) if auth is not needed.

### ORM — Drizzle ORM

Chosen over Prisma for: smaller bundle, native SQL feel, first-class Next.js App Router support.

---

## Database schema

```sql
-- Reference tables
supermarkets   (id, name, slug)
categories     (id, name, slug)
products       (id, name, unit, category_id → categories)

-- Price snapshots (one row per CSV upload)
price_snapshots (
  id, label, snapshot_date,
  uploaded_by → users,   -- null = anonymous / admin import
  created_at
)

-- Prices (one row per product × supermarket × snapshot)
prices (
  id,
  snapshot_id  → price_snapshots,
  product_id   → products,
  supermarket_id → supermarkets,
  price        NUMERIC(8,2) NULL   -- NULL = not available in that store
)

-- Persisted shopping lists (optional, phase 3)
shopping_lists (
  id, user_id → users, name, created_at, updated_at
)
shopping_list_items (
  id, list_id → shopping_lists, product_id → products
)
```

**Indexes:** `prices(snapshot_id)`, `prices(product_id, supermarket_id)`, `price_snapshots(snapshot_date DESC)`

---

## Folder structure (target)

```
next-app/
├── app/
│   ├── page.tsx                   Server Component — fetches latest snapshot
│   ├── history/page.tsx           Price history viewer (#3)
│   ├── upload/page.tsx            Admin CSV upload (protected)
│   └── api/
│       └── upload/route.ts        POST — parse CSV → insert snapshot
│
├── lib/
│   ├── parse-csv.ts               Still used for CSV → normalised rows
│   ├── db/
│   │   ├── client.ts              Drizzle client (supabase postgres url)
│   │   ├── schema.ts              Drizzle schema (mirrors tables above)
│   │   └── queries.ts             getLatestSnapshot(), getSnapshotById(),
│   │                              getSnapshotDates(), upsertSnapshot()
│   └── analysis.ts                buildAnalysis(rows) — replaces parseCsv,
│                                  same Analysis type output → zero component changes
│
├── components/                    Unchanged — all consume Analysis type
│   ├── price-comparison.tsx
│   ├── category-ranking.tsx
│   ├── route-optimizer.tsx
│   ├── summary-cards.tsx
│   └── history/                   New components for #3
│       ├── snapshot-selector.tsx
│       ├── price-trend-chart.tsx
│       └── store-inflation-table.tsx
│
└── supabase/
    └── migrations/                SQL migration files (managed by Drizzle Kit)
```

---

## Migration path (phased)

### Phase 1 — DB replaces CSV (no visible change)
- Create Supabase project, run migrations
- Import current `data.csv` as the first snapshot via seed script
- Replace `fs.readFileSync` in `page.tsx` with `getLatestSnapshot()` from `lib/db/queries.ts`
- `buildAnalysis()` returns the same `Analysis` type — zero component changes
- Redeploy = no longer needed to update prices; upload a new CSV instead

### Phase 2 — Price history (#3)
- Add snapshot date selector in the header (server-rendered `<select>`)
- Add `/history` page with trend charts (Recharts or shadcn Charts)
- Add "Biggest movers" card: products with largest Δprice since previous snapshot
- Add store inflation table: % price increase per store across snapshots

### Phase 3 — Persistent shopping lists
- Add Supabase Auth (email magic link or Google OAuth)
- Save/load shopping lists from `shopping_lists` + `shopping_list_items`
- Keep URL-share as fallback for anonymous users
- List names + created_at shown in a saved lists dropdown

### Phase 4 — Admin upload
- Protected `/upload` route (Supabase RLS: only admin role)
- Drag-and-drop CSV upload → stored in Supabase Storage
- Server Action parses CSV, calls `upsertSnapshot()`, triggers revalidation
- Optionally: store raw CSV file in Storage for audit trail

---

## Key design decisions

| Decision | Choice | Reason |
|---|---|---|
| DB | Supabase | Auth + Storage + Postgres in one free plan |
| ORM | Drizzle | Lightweight, type-safe, no CLI runtime needed |
| Analysis type | Keep unchanged | Zero component rewrites across phases |
| Auth | Optional until Phase 3 | Avoids complexity before history is useful |
| CSV parsing | Keep `parse-csv.ts` | Reused by both seed script and upload API |
| Rendering | Server Components for data | Keeps client bundle small |

---

## Environment variables needed

```env
DATABASE_URL=postgresql://...          # Supabase direct connection (migrations)
NEXT_PUBLIC_SUPABASE_URL=https://...   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # Public anon key
SUPABASE_SERVICE_ROLE_KEY=...          # Server-only (upload API, seed)
```

---

## Free tier capacity estimate

| Resource | Used | Supabase free limit |
|---|---|---|
| DB storage | ~5 MB / 100 snapshots | 500 MB |
| File storage (CSVs) | ~50 KB / upload | 1 GB |
| Auth users | <100 | 50,000 |
| API requests | Low traffic | Unlimited |

Well within free tier for a personal or small-team tool.
