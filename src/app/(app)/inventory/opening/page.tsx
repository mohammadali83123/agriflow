export const dynamic = "force-dynamic";
export const metadata = { title: "Opening Stock" };

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Info } from "lucide-react";
import { listProducts, listVariants } from "@/server/products/actions";
import { listWarehouses } from "@/server/inventory/actions";
import { OpeningForm } from "@/components/inventory/opening-form";

export default async function OpeningStockPage() {
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
        <h1 className="text-2xl font-bold tracking-tight">Opening stock</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter stock already in your warehouse before starting operations.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
        <Info className="size-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <strong>When to use this:</strong> Use opening stock to record
          inventory that was already in your godown when you first started
          using AgriFlow. For new purchases, use{" "}
          <Link
            href="/inventory/receive"
            className="underline font-medium"
          >
            Receive Stock
          </Link>{" "}
          instead.
        </div>
      </div>

      {warehouses.length === 0 ? (
        <div className="rounded-2xl border bg-card shadow-sm p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            You need at least one warehouse before recording stock.
          </p>
          <Link href="/inventory/warehouses" className="text-sm underline">
            Create a warehouse →
          </Link>
        </div>
      ) : (
        <OpeningForm
          products={products}
          variants={variants}
          warehouses={warehouses}
        />
      )}
    </div>
  );
}
