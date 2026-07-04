export const dynamic = "force-dynamic";
export const metadata = { title: "Inventory" };

import Link from "next/link";
import { ArrowDownToLine, ClipboardList, SlidersHorizontal } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStockLevels } from "@/server/inventory/actions";
import { StockTable } from "@/components/inventory/stock-table";

export default async function InventoryPage() {
  const stockLevels = await getStockLevels();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          {stockLevels.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {stockLevels.length} {stockLevels.length === 1 ? "line" : "lines"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/inventory/receive"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <ArrowDownToLine className="size-4" />
            Receive stock
          </Link>
          <Link
            href="/inventory/opening"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <ClipboardList className="size-4" />
            Opening stock
          </Link>
          <Link
            href="/inventory/adjust"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <SlidersHorizontal className="size-4" />
            Adjustment
          </Link>
        </div>
      </div>

      <StockTable stockLevels={stockLevels} />

      <div className="mt-4 flex justify-end">
        <Link
          href="/inventory/warehouses"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Manage warehouses →
        </Link>
      </div>
    </div>
  );
}
