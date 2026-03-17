"use client"

import { useState, useTransition, useRef } from "react"
import {
  Plus,
  PencilSimple,
  Trash,
  Check,
  X,
  FloppyDisk,
  Database,
  Tag,
  ShoppingCart,
  Calendar,
  CurrencyEur,
  Storefront,
} from "@phosphor-icons/react"
import {
  createSupermarket,
  updateSupermarket,
  deleteSupermarket,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  createSnapshot,
  deleteSnapshot,
  upsertPrice,
  fetchSupermarkets,
  fetchCategories,
  fetchProducts,
  fetchSnapshots,
  fetchPrices,
} from "./actions"

// ── Types ─────────────────────────────────────────────────────────────────────

type Sm = { id: number; name: string; slug: string }
type Cat = { id: number; name: string; slug: string }
type Prod = {
  id: number
  name: string
  unit: string
  categoryId: number
  categoryName: string
}
type Snap = {
  id: number
  label: string
  snapshotDate: string
  createdAt: Date
  priceCount: number
}
type PriceEntry = {
  id: number
  productId: number
  supermarketId: number
  price: string | null
  productName: string
  supermarketName: string
}

interface Props {
  initialSupermarkets: Sm[]
  initialCategories: Cat[]
  initialProducts: Prod[]
  initialSnapshots: Snap[]
  initialPrices: PriceEntry[]
}

type Tab = "supermarkets" | "categories" | "products" | "snapshots" | "prices"

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

// ── Shared styles ─────────────────────────────────────────────────────────────

const th =
  "px-3 py-2 text-left text-[11px] font-mono uppercase tracking-[0.12em] text-foreground/60 border-b border-border bg-muted/40"
const td = "px-3 py-2 text-sm font-mono border-b border-border/60 text-foreground"
const inp =
  "bg-input/60 border border-border rounded px-2 py-1 text-sm font-mono w-full focus:outline-none focus:border-primary focus:ring-0 text-foreground placeholder:text-muted-foreground"
const btn =
  "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors"

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ active = true }: { active?: boolean }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${active ? "animate-pulse bg-green-400" : "bg-muted-foreground"}`}
    />
  )
}

function ConfirmDelete({
  onConfirm,
  pending,
}: {
  onConfirm: () => void
  pending: boolean
}) {
  const [armed, setArmed] = useState(false)
  if (armed)
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={onConfirm}
          disabled={pending}
          className={`${btn} bg-destructive/30 text-destructive hover:bg-destructive/50`}
        >
          <Check size={12} /> confirm
        </button>
        <button
          onClick={() => setArmed(false)}
          className={`${btn} text-muted-foreground hover:text-foreground`}
        >
          <X size={12} />
        </button>
      </span>
    )
  return (
    <button
      onClick={() => setArmed(true)}
      className={`${btn} text-destructive/60 hover:text-destructive`}
    >
      <Trash size={12} />
    </button>
  )
}

// ── Supermarkets panel ────────────────────────────────────────────────────────

function SupermarketsPanel({
  data,
  onRefresh,
}: {
  data: Sm[]
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [newName, setNewName] = useState("")

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn()
      onRefresh()
    })

  return (
    <div>
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>ID</th>
            <th className={th}>Name</th>
            <th className={th}>Slug</th>
            <th className={th + " text-right"}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((sm) => (
            <tr key={sm.id} className="hover:bg-muted/60 group">
              <td className={`${td} text-muted-foreground w-12`}>{sm.id}</td>
              <td className={td}>
                {editId === sm.id ? (
                  <input
                    className={inp}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                ) : (
                  sm.name
                )}
              </td>
              <td className={`${td} text-muted-foreground`}>{sm.slug}</td>
              <td className={`${td} text-right`}>
                {editId === sm.id ? (
                  <span className="flex items-center justify-end gap-1">
                    <button
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          await updateSupermarket(sm.id, editName)
                          setEditId(null)
                        })
                      }
                      className={`${btn} bg-primary/25 text-primary hover:bg-primary/35`}
                    >
                      <FloppyDisk size={12} /> save
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className={`${btn} text-muted-foreground hover:text-foreground`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ) : (
                  <span className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => {
                        setEditId(sm.id)
                        setEditName(sm.name)
                      }}
                      className={`${btn} text-foreground/70 hover:text-foreground`}
                    >
                      <PencilSimple size={12} />
                    </button>
                    <ConfirmDelete
                      pending={pending}
                      onConfirm={() =>
                        run(() => deleteSupermarket(sm.id))
                      }
                    />
                  </span>
                )}
              </td>
            </tr>
          ))}
          {/* Add row */}
          <tr className="bg-muted/40">
            <td className={`${td} text-muted-foreground`}>+</td>
            <td className={td}>
              <input
                className={inp}
                placeholder="New supermarket…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim())
                    run(async () => {
                      await createSupermarket(newName)
                      setNewName("")
                    })
                }}
              />
            </td>
            <td className={td} />
            <td className={`${td} text-right`}>
              <button
                disabled={!newName.trim() || pending}
                onClick={() =>
                  run(async () => {
                    await createSupermarket(newName)
                    setNewName("")
                  })
                }
                className={`${btn} bg-primary/25 text-primary hover:bg-primary/35 disabled:opacity-40`}
              >
                <Plus size={12} /> add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Categories panel ──────────────────────────────────────────────────────────

function CategoriesPanel({
  data,
  onRefresh,
}: {
  data: Cat[]
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [newName, setNewName] = useState("")

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn()
      onRefresh()
    })

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className={th}>ID</th>
          <th className={th}>Name</th>
          <th className={th}>Slug</th>
          <th className={th + " text-right"}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((cat) => (
          <tr key={cat.id} className="hover:bg-muted/60 group">
            <td className={`${td} text-muted-foreground w-12`}>{cat.id}</td>
            <td className={td}>
              {editId === cat.id ? (
                <input
                  className={inp}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              ) : (
                cat.name
              )}
            </td>
            <td className={`${td} text-muted-foreground`}>{cat.slug}</td>
            <td className={`${td} text-right`}>
              {editId === cat.id ? (
                <span className="flex items-center justify-end gap-1">
                  <button
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await updateCategory(cat.id, editName)
                        setEditId(null)
                      })
                    }
                    className={`${btn} bg-primary/25 text-primary hover:bg-primary/35`}
                  >
                    <FloppyDisk size={12} /> save
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className={`${btn} text-muted-foreground hover:text-foreground`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ) : (
                <span className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setEditId(cat.id)
                      setEditName(cat.name)
                    }}
                    className={`${btn} text-foreground/70 hover:text-foreground`}
                  >
                    <PencilSimple size={12} />
                  </button>
                  <ConfirmDelete
                    pending={pending}
                    onConfirm={() => run(() => deleteCategory(cat.id))}
                  />
                </span>
              )}
            </td>
          </tr>
        ))}
        <tr className="bg-muted/40">
          <td className={`${td} text-muted-foreground`}>+</td>
          <td className={td}>
            <input
              className={inp}
              placeholder="New category…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim())
                  run(async () => {
                    await createCategory(newName)
                    setNewName("")
                  })
              }}
            />
          </td>
          <td className={td} />
          <td className={`${td} text-right`}>
            <button
              disabled={!newName.trim() || pending}
              onClick={() =>
                run(async () => {
                  await createCategory(newName)
                  setNewName("")
                })
              }
              className={`${btn} bg-primary/25 text-primary hover:bg-primary/35 disabled:opacity-40`}
            >
              <Plus size={12} /> add
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// ── Products panel ────────────────────────────────────────────────────────────

function ProductsPanel({
  data,
  categories,
  onRefresh,
}: {
  data: Prod[]
  categories: Cat[]
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editUnit, setEditUnit] = useState("")
  const [editCatId, setEditCatId] = useState(0)
  const [newName, setNewName] = useState("")
  const [newUnit, setNewUnit] = useState("")
  const [newCatId, setNewCatId] = useState(categories[0]?.id ?? 0)

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn()
      onRefresh()
    })

  const selectCls = `${inp} cursor-pointer`

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className={th}>ID</th>
          <th className={th}>Name</th>
          <th className={th}>Unit</th>
          <th className={th}>Category</th>
          <th className={th + " text-right"}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p) => (
          <tr key={p.id} className="hover:bg-muted/60 group">
            <td className={`${td} text-muted-foreground w-12`}>{p.id}</td>
            <td className={td}>
              {editId === p.id ? (
                <input
                  className={inp}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              ) : (
                p.name
              )}
            </td>
            <td className={`${td} w-20`}>
              {editId === p.id ? (
                <input
                  className={inp}
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                />
              ) : (
                <span className="text-muted-foreground">{p.unit}</span>
              )}
            </td>
            <td className={`${td} w-36`}>
              {editId === p.id ? (
                <select
                  className={selectCls}
                  value={editCatId}
                  onChange={(e) => setEditCatId(Number(e.target.value))}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-muted-foreground">{p.categoryName}</span>
              )}
            </td>
            <td className={`${td} text-right`}>
              {editId === p.id ? (
                <span className="flex items-center justify-end gap-1">
                  <button
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await updateProduct(p.id, editName, editUnit, editCatId)
                        setEditId(null)
                      })
                    }
                    className={`${btn} bg-primary/25 text-primary hover:bg-primary/35`}
                  >
                    <FloppyDisk size={12} /> save
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className={`${btn} text-muted-foreground hover:text-foreground`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ) : (
                <span className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setEditId(p.id)
                      setEditName(p.name)
                      setEditUnit(p.unit)
                      setEditCatId(p.categoryId)
                    }}
                    className={`${btn} text-foreground/70 hover:text-foreground`}
                  >
                    <PencilSimple size={12} />
                  </button>
                  <ConfirmDelete
                    pending={pending}
                    onConfirm={() => run(() => deleteProduct(p.id))}
                  />
                </span>
              )}
            </td>
          </tr>
        ))}
        <tr className="bg-muted/40">
          <td className={`${td} text-muted-foreground`}>+</td>
          <td className={td}>
            <input
              className={inp}
              placeholder="Product name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </td>
          <td className={td}>
            <input
              className={inp}
              placeholder="kg"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
            />
          </td>
          <td className={td}>
            <select
              className={selectCls}
              value={newCatId}
              onChange={(e) => setNewCatId(Number(e.target.value))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </td>
          <td className={`${td} text-right`}>
            <button
              disabled={!newName.trim() || !newUnit.trim() || pending}
              onClick={() =>
                run(async () => {
                  await createProduct(newName, newUnit, newCatId)
                  setNewName("")
                  setNewUnit("")
                })
              }
              className={`${btn} bg-primary/25 text-primary hover:bg-primary/35 disabled:opacity-40`}
            >
              <Plus size={12} /> add
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// ── Snapshots panel ───────────────────────────────────────────────────────────

function SnapshotsPanel({
  data,
  onRefresh,
}: {
  data: Snap[]
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [newLabel, setNewLabel] = useState("")
  const [newDate, setNewDate] = useState(
    new Date().toISOString().split("T")[0],
  )

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn()
      onRefresh()
    })

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className={th}>ID</th>
          <th className={th}>Label</th>
          <th className={th}>Date</th>
          <th className={th}>Prices</th>
          <th className={th}>Created</th>
          <th className={th + " text-right"}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((s) => (
          <tr key={s.id} className="hover:bg-muted/60 group">
            <td className={`${td} text-muted-foreground w-12`}>{s.id}</td>
            <td className={td}>{s.label}</td>
            <td className={`${td} tabular-nums`}>{fmtDate(s.snapshotDate)}</td>
            <td className={td}>
              <span className="rounded bg-primary/25 px-1.5 py-0.5 text-xs text-foreground font-medium">
                {s.priceCount}
              </span>
            </td>
            <td className={`${td} text-muted-foreground tabular-nums text-xs`}>
              {fmtDate(s.createdAt)}
            </td>
            <td className={`${td} text-right`}>
              <span className="opacity-0 group-hover:opacity-100">
                <ConfirmDelete
                  pending={pending}
                  onConfirm={() => run(() => deleteSnapshot(s.id))}
                />
              </span>
            </td>
          </tr>
        ))}
        <tr className="bg-muted/40">
          <td className={`${td} text-muted-foreground`}>+</td>
          <td className={td}>
            <input
              className={inp}
              placeholder="Label…"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </td>
          <td className={td}>
            <input
              className={inp}
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </td>
          <td className={td} />
          <td className={td} />
          <td className={`${td} text-right`}>
            <button
              disabled={!newLabel.trim() || pending}
              onClick={() =>
                run(async () => {
                  await createSnapshot(newLabel, newDate)
                  setNewLabel("")
                })
              }
              className={`${btn} bg-primary/25 text-primary hover:bg-primary/35 disabled:opacity-40`}
            >
              <Plus size={12} /> add
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

// ── Price cell ────────────────────────────────────────────────────────────────

function PriceCell({
  value,
  snapshotId,
  productId,
  supermarketId,
}: {
  value: string | null
  snapshotId: number
  productId: number
  supermarketId: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const save = async () => {
    setSaving(true)
    await upsertPrice(snapshotId, productId, supermarketId, draft || null)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={ref}
        className="w-20 rounded border border-border bg-input px-1.5 py-0.5 text-center text-xs font-mono focus:outline-none focus:border-primary text-foreground"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") ref.current?.blur()
          if (e.key === "Escape") {
            setDraft(value ?? "")
            setEditing(false)
          }
        }}
        autoFocus
        disabled={saving}
      />
    )
  }

  return (
    <button
      onClick={() => {
        setDraft(value ?? "")
        setEditing(true)
      }}
      className={`w-20 rounded px-1.5 py-0.5 text-center text-xs font-mono transition-colors ${
        value !== null
          ? "text-foreground hover:bg-muted/60"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground/60"
      }`}
    >
      {value !== null ? `€${parseFloat(value).toFixed(2)}` : "—"}
    </button>
  )
}

// ── Prices panel ──────────────────────────────────────────────────────────────

function PricesPanel({
  snapshots,
  supermarkets,
  products,
  initialPrices,
  initialSnapshotId,
}: {
  snapshots: Snap[]
  supermarkets: Sm[]
  products: Prod[]
  initialPrices: PriceEntry[]
  initialSnapshotId: number | null
}) {
  const [selectedId, setSelectedId] = useState<number | null>(
    initialSnapshotId,
  )
  const [prices, setPrices] = useState<PriceEntry[]>(initialPrices)
  const [, startTransition] = useTransition()

  const loadSnapshot = (id: number) => {
    setSelectedId(id)
    startTransition(async () => {
      const data = await fetchPrices(id)
      setPrices(data)
    })
  }

  // Build lookup: productId × supermarketId → price
  const lookup = new Map<string, string | null>()
  for (const p of prices) {
    lookup.set(`${p.productId}:${p.supermarketId}`, p.price)
  }

  if (snapshots.length === 0)
    return (
      <p className="p-6 text-sm text-muted-foreground font-mono">
        No snapshots yet. Create one in the Snapshots tab first.
      </p>
    )

  if (products.length === 0)
    return (
      <p className="p-6 text-sm text-muted-foreground font-mono">
        No products yet. Add some in the Products tab first.
      </p>
    )

  return (
    <div>
      {/* Snapshot selector */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-foreground/60">
          Snapshot
        </span>
        <select
          className={`${inp} w-auto min-w-48`}
          value={selectedId ?? ""}
          onChange={(e) => loadSnapshot(Number(e.target.value))}
        >
          {snapshots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} — {fmtDate(s.snapshotDate)}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground font-mono">
          {prices.length} entries · click any cell to edit · Enter or blur to save
        </span>
      </div>

      {/* Price grid — all products × all supermarkets */}
      {selectedId ? (
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${th} sticky left-0 z-10 bg-card min-w-48`}>
                  Product
                </th>
                <th className={`${th} text-muted-foreground`}>Category</th>
                {supermarkets.map((sm) => (
                  <th key={sm.id} className={`${th} text-center`}>
                    {sm.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-muted/60 group">
                  <td
                    className={`${td} sticky left-0 bg-card group-hover:bg-muted/60 z-10 font-mono text-xs`}
                  >
                    {p.name}
                  </td>
                  <td className={`${td} text-muted-foreground text-xs`}>
                    {p.categoryName}
                  </td>
                  {supermarkets.map((sm) => (
                    <td key={sm.id} className={`${td} text-center p-1`}>
                      <PriceCell
                        value={lookup.get(`${p.id}:${sm.id}`) ?? null}
                        snapshotId={selectedId}
                        productId={p.id}
                        supermarketId={sm.id}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-6 text-sm text-muted-foreground font-mono">
          Select a snapshot above.
        </p>
      )}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.FC<{ size: number }> }[] = [
  { key: "supermarkets", label: "Supermarkets", icon: Storefront },
  { key: "categories", label: "Categories", icon: Tag },
  { key: "products", label: "Products", icon: ShoppingCart },
  { key: "snapshots", label: "Snapshots", icon: Calendar },
  { key: "prices", label: "Prices", icon: CurrencyEur },
]

export function AdminDashboard({
  initialSupermarkets,
  initialCategories,
  initialProducts,
  initialSnapshots,
  initialPrices,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("supermarkets")
  const [sms, setSms] = useState(initialSupermarkets)
  const [cats, setCats] = useState(initialCategories)
  const [prods, setProds] = useState(initialProducts)
  const [snaps, setSnaps] = useState(initialSnapshots)

  // Per-tab refresh callbacks
  const refresh = {
    supermarkets: () => fetchSupermarkets().then(setSms),
    categories: () => fetchCategories().then(setCats),
    products: () => fetchProducts().then(setProds),
    snapshots: () => fetchSnapshots().then(setSnaps),
    prices: () => Promise.resolve(),
  }

  const counts: Record<Tab, number> = {
    supermarkets: sms.length,
    categories: cats.length,
    products: prods.length,
    snapshots: snaps.length,
    prices: snaps.reduce((a, s) => a + s.priceCount, 0),
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground font-mono">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot />
          <span className="text-xs uppercase tracking-[0.2em] text-foreground font-semibold">
            Compra Facil
          </span>
          <span className="text-foreground/30">/</span>
          <span className="text-xs uppercase tracking-[0.2em] text-foreground/60">
            Mission Control
          </span>
        </div>
        <div className="flex items-center gap-6 text-[11px] text-foreground/70">
          <span className="flex items-center gap-1.5">
            <Database size={12} className="text-primary" />
            {sms.length} supermarkets
          </span>
          <span className="flex items-center gap-1.5">
            <Tag size={12} className="text-primary" />
            {cats.length} categories
          </span>
          <span className="flex items-center gap-1.5">
            <ShoppingCart size={12} className="text-primary" />
            {prods.length} products
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="text-primary" />
            {snaps.length} snapshots
          </span>
          <a
            href="/"
            className="ml-2 text-foreground/60 hover:text-foreground transition-colors"
          >
            ← back to app
          </a>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="flex border-b border-border px-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-[0.12em] border-b-2 transition-colors ${
              activeTab === key
                ? "border-primary text-foreground"
                : "border-transparent text-foreground/50 hover:text-foreground/80"
            }`}
          >
            <Icon size={13} />
            {label}
            <span
              className={`rounded px-1 py-px text-[10px] tabular-nums ${
                activeTab === key
                  ? "bg-primary/30 text-foreground"
                  : "bg-muted text-foreground/50"
              }`}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </nav>

      {/* Panel */}
      <main className="p-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 flex items-center gap-2 bg-muted/30">
            <StatusDot />
            <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/70">
              {TABS.find((t) => t.key === activeTab)?.label}
            </span>
            <span className="ml-auto text-[10px] text-foreground/50">
              {counts[activeTab]} records
            </span>
          </div>

          <div className="overflow-auto max-h-[calc(100vh-200px)]">
            {activeTab === "supermarkets" && (
              <SupermarketsPanel
                data={sms}
                onRefresh={refresh.supermarkets}
              />
            )}
            {activeTab === "categories" && (
              <CategoriesPanel data={cats} onRefresh={refresh.categories} />
            )}
            {activeTab === "products" && (
              <ProductsPanel
                data={prods}
                categories={cats}
                onRefresh={refresh.products}
              />
            )}
            {activeTab === "snapshots" && (
              <SnapshotsPanel data={snaps} onRefresh={refresh.snapshots} />
            )}
            {activeTab === "prices" && (
              <PricesPanel
                snapshots={snaps}
                supermarkets={sms}
                products={prods}
                initialPrices={initialPrices}
                initialSnapshotId={snaps[0]?.id ?? null}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
