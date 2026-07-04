"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatRupees } from "@/lib/money";
import type { StockLevel } from "@/server/inventory/actions";

interface StockTableProps {
  stockLevels: StockLevel[];
}

export function StockTable({ stockLevels }: StockTableProps) {
  if (stockLevels.length === 0) {
    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <Package className="size-12 text-muted-foreground/40 mb-4" />
          <p className="text-base font-medium text-muted-foreground">
            No stock recorded yet
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Start by entering opening stock or recording a purchase.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/inventory/receive"
              className={buttonVariants({ variant: "default" })}
            >
              Receive stock
            </Link>
            <Link
              href="/inventory/opening"
              className={buttonVariants({ variant: "outline" })}
            >
              Opening stock
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Product
            </th>
            <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Warehouse
            </th>
            <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stock
            </th>
            <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
              Avg Cost / unit
            </th>
            <th className="text-right px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
              Value
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {stockLevels.map((row) => (
            <tr
              key={`${row.productId}-${row.warehouseId}`}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="px-4 py-4 font-medium">{row.productName}</td>
              <td className="px-4 py-4 text-muted-foreground">
                {row.warehouseName}
              </td>
              <td className="px-4 py-4 text-right tabular-nums">
                <span
                  className={
                    row.quantity === 0
                      ? "text-muted-foreground"
                      : row.quantity < 10
                      ? "text-orange-600 font-semibold"
                      : "font-semibold"
                  }
                >
                  {row.quantity.toFixed(3)}
                </span>{" "}
                <span className="text-muted-foreground text-xs">
                  {row.baseUnit}
                </span>
              </td>
              <td className="px-4 py-4 text-right font-mono tabular-nums hidden sm:table-cell text-muted-foreground">
                {row.avgCostMinor > 0n
                  ? formatRupees(row.avgCostMinor)
                  : "—"}
              </td>
              <td className="px-4 py-4 text-right font-mono tabular-nums hidden md:table-cell">
                {row.valueMinor > 0n ? formatRupees(row.valueMinor) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
