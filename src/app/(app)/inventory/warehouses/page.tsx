export const dynamic = "force-dynamic";
export const metadata = { title: "Warehouses" };

import Link from "next/link";
import { ChevronLeft, Warehouse as WarehouseIcon } from "lucide-react";
import { listWarehouses } from "@/server/inventory/actions";
import { WarehousesClient } from "@/components/inventory/warehouses-client";

export default async function WarehousesPage() {
  const warehouses = await listWarehouses();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="size-4" /> Inventory
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Warehouses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage the locations where you store your stock.
            </p>
          </div>
        </div>
      </div>

      <WarehousesClient warehouses={warehouses} />
    </div>
  );
}
