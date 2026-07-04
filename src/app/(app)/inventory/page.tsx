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
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Current stock levels across all warehouses</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/inventory/receive"
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1.5")}
          >
            <ArrowDownToLine className="size-4" />
            Receive stock
          </Link>
          <Link
            href="/inventory/opening"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <ClipboardList className="size-4" />
            Opening stock
          </Link>
          <Link
            href="/inventory/adjust"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
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
