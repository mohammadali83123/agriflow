export const dynamic = "force-dynamic";
export const metadata = { title: "Receive Stock" };

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listProducts, listVariants } from "@/server/products/actions";
import { listWarehouses } from "@/server/inventory/actions";
import { listSuppliers } from "@/server/suppliers/actions";
import { ReceiveForm } from "@/components/inventory/receive-form";

export default async function ReceiveStockPage() {
  const [productsResult, warehousesResult, suppliersResult] = await Promise.all([
    listProducts(),
    listWarehouses(),
    listSuppliers(),
  ]);

  const products = productsResult.data ?? [];
  const warehouses = warehousesResult;
  const suppliers = suppliersResult;

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
        <h1 className="text-2xl font-bold tracking-tight">Receive stock</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record stock received from a supplier or transfer.
        </p>
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
        <ReceiveForm
          products={products}
          variants={variants}
          warehouses={warehouses}
          suppliers={suppliers.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))}
        />
      )}
    </div>
  );
}
