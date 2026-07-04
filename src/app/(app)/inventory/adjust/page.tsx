export const dynamic = "force-dynamic";
export const metadata = { title: "Stock Adjustment" };

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listProducts, listVariants } from "@/server/products/actions";
import { listWarehouses } from "@/server/inventory/actions";
import { AdjustForm } from "@/components/inventory/adjust-form";

export default async function AdjustStockPage() {
  const [productsResult, warehousesResult] = await Promise.all([
    listProducts(),
    listWarehouses(),
  ]);

  const products = productsResult.data ?? [];
  const warehouses = warehousesResult;

  // Pre-load all variants for active products
  const activeProductIds = products.map((p) => p.id);
  const variantResults = await Promise.all(
    activeProductIds.map((id) => listVariants(id))
  );
  const variants = variantResults.flatMap((r) => r.data ?? []);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="size-4" /> Inventory
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Stock adjustment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Correct stock levels for damage, theft, sample, or audit
          discrepancies.
        </p>
      </div>

      {warehouses.length === 0 ? (
        <div className="rounded-2xl border bg-card shadow-sm p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            You need at least one warehouse before making adjustments.
          </p>
          <Link href="/inventory/warehouses" className="text-sm underline">
            Create a warehouse →
          </Link>
        </div>
      ) : (
        <AdjustForm
          products={products}
          variants={variants}
          warehouses={warehouses}
        />
      )}
    </div>
  );
}
