# Pending Features

---

## #3 — Histórico de precios

Track price changes over time by uploading multiple CSV files with a date. Show which products are getting more expensive and which stores raise prices fastest.

### Notes
- Requires a date-tagged CSV upload flow (or a naming convention like `data-2026-03.csv`)
- Core views needed:
  - Price trend per product (sparkline or delta vs previous period)
  - Store inflation ranking (which store raises prices most over time)
  - "Biggest movers" — products with largest price increase/decrease since last upload
- Needs a persistent storage layer (localStorage, IndexedDB, or server-side) to keep historical data across sessions
- Complexity: **high** — requires multi-file management and time-series data model

---

## #4 — Cesta por presupuesto

Given a budget (e.g. €50), auto-select which products to prioritise and where to buy them to maximise basket value within the limit.

### Open questions before implementation

**1. What does "maximise value" mean?**
Since products have no nutritional or weight data, the algorithm needs a defined objective:
- **Maximize product count** — fit as many items as possible (prioritise cheap items first)
- **Maximize savings** — prioritise products with the highest price gap between stores (items where choosing right saves the most)
- **User-defined priority** — let the user drag/star products to mark essentials vs optional

Which fits best? Or a combination (essentials first, then fill remaining budget by savings)?

**2. Should travel cost be included in the budget?**
- Deduct the Ahorro por ruta cost per visit from the budget before allocating products?
- Or treat the budget as basket-only (ignoring travel)?

**3. What does the output look like?**
- Auto-check the selected products in the existing shopping list (list populates automatically)?
- Or a separate dedicated card showing "with €50, buy these X products for €48.50"?

**4. Mandatory vs optional products?**
- Should the user be able to mark some products as "always include" (essentials) that are guaranteed to be in the basket regardless of price?
- The algorithm then fills the remaining budget with the rest.

**5. Budget scope — which price baseline?**
- Optimal basket (each product at its cheapest store across all supermarkets)?
- Single store (you only go to Mercadona with €50)?
- Or route-optimal (best combination of stores given travel cost)?

---

## #5 — Alertas de precio

Notify the user when a product's price drops below a target they set, or when it rises above a threshold (to flag inflation).

### Notes
- Requires #3 (price history) to be useful — needs at least two snapshots to detect change
- Alert definition: user sets a target price per product, stored in localStorage or user account
- Delivery options: in-app badge on next visit, email (requires auth + email service), or Web Push
- Could also auto-alert on any price drop ≥ X% between snapshots (no manual setup needed)
- Complexity: **medium** — simple if in-app only; high if push/email notifications needed

---

---

## #8 — Modo compra (vista móvil)

A dedicated full-screen shopping mode optimised for use in-store: large text, one product per screen, tap to tick off, progress bar.

### Notes
- Triggered by a "Start shopping" button that activates a full-screen overlay
- Shows the store-grouped list (same order as the exported .txt)
- Swipe or tap → mark item as collected; swipe back → undo
- No scroll — each item fills the viewport for easy glancing while pushing a trolley
- Could integrate barcode scanner (BarcodeDetector API) to auto-tick items
- Complexity: **medium** — pure UI feature, no backend needed

---

## #9 — Sustituciones inteligentes

When a product is unavailable at the cheapest store, suggest the closest substitute available there (e.g. "Leche entera 1L Hacendado → Leche entera 1L Dia marca propia").

### Notes
- Requires a "substitution group" or "canonical product" field in the data layer linking equivalent products
- UI: unavailable rows show a "Ver alternativa" inline suggestion
- Useful for route optimization — keeps a store in the route even when one item is out of stock
- Complexity: **high** — requires curated substitution data or a similarity algorithm

---

## #10 — Exportar lista como QR

Generate a QR code containing the shopping list URL so it can be instantly opened on a phone without typing.

### Notes
- The share URL already encodes the list; just render it as a QR in a dialog
- Use a lightweight client-side QR library (e.g. `qrcode` npm package, ~10 KB)
- No backend needed
- Complexity: **low**

---

## #11 — Soporte multi-ciudad / multi-dataset

Support multiple price datasets (e.g. Barcelona vs Madrid vs Valencia) selectable from a dropdown.

### Notes
- Prices vary significantly by city; a dataset per city makes the tool broadly useful
- Implementation: multiple CSV files (or DB snapshots tagged by city); user selects city on first visit (stored in localStorage)
- Could be community-contributed: each city maintainer uploads their own CSV
- Complexity: **medium** — mostly a data organisation change; UI only needs a city selector

---

## #12 — Destacar productos con mayor volatilidad de precio

Identify products whose price changes most across stores (high spread) and flag them as "vale la pena comparar" — worth checking before buying.

### Notes
- Already derivable from current data: `(max - min) / min * 100` per product
- Display: badge or icon in the comparativa table for products above a volatility threshold (e.g. >30% spread)
- Helps users focus their comparison effort on items where it matters most
- Complexity: **very low** — data already exists, UI only
