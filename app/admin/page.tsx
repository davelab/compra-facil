import {
  getAllSupermarkets,
  getAllCategories,
  getAllProducts,
  getAllSnapshots,
  getPricesForSnapshot,
} from "@/lib/db/admin-queries"
import { AdminDashboard } from "./AdminDashboard"

export default async function AdminPage() {
  const [supermarkets, categories, products, snapshots] = await Promise.all([
    getAllSupermarkets(),
    getAllCategories(),
    getAllProducts(),
    getAllSnapshots(),
  ])

  const latestSnapshotId = snapshots[0]?.id ?? null
  const prices = latestSnapshotId
    ? await getPricesForSnapshot(latestSnapshotId)
    : []

  return (
    <AdminDashboard
      initialSupermarkets={supermarkets}
      initialCategories={categories}
      initialProducts={products}
      initialSnapshots={snapshots}
      initialPrices={prices}
    />
  )
}
