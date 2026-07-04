"use client";

import Link from "next/link";
import { Factory } from "lucide-react";
import type { BatchListItem } from "@/server/production/actions";

interface BatchesTableProps {
  batches: BatchListItem[];
}

function StatusBadge({ status }: { status: "draft" | "completed" }) {
  if (status === "completed") {
    return (
      <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">
        Completed
      </span>
    );
  }
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700">
      Draft
    </span>
  );
}

export function BatchesTable({ batches }: BatchesTableProps) {
  if (batches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Factory className="size-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          No production batches yet
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Create a batch to start recording milling runs.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden shadow-sm">
      <table className="w-full">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Batch #
            </th>
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
              Date
            </th>
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </th>
            <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
              Inputs
            </th>
            <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
              Outputs
            </th>
            <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
              Yield %
            </th>
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
              Warehouse
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {batches.map((batch) => (
            <tr key={batch.id} className="hover:bg-muted/20 transition-colors">
              <td className="py-4 px-4">
                <Link
                  href={`/production/${batch.id}`}
                  className="font-medium text-sm hover:underline"
                >
                  {batch.batchNumber}
                </Link>
              </td>
              <td className="py-4 px-4 text-sm text-muted-foreground hidden sm:table-cell">
                {new Date(batch.productionDate).toLocaleDateString("en-PK", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="py-4 px-4">
                <StatusBadge status={batch.status} />
              </td>
              <td className="py-4 px-4 text-right text-sm text-muted-foreground hidden md:table-cell">
                {batch.inputCount} ({batch.totalInputQty.toFixed(1)})
              </td>
              <td className="py-4 px-4 text-right text-sm text-muted-foreground hidden md:table-cell">
                {batch.outputCount} ({batch.totalOutputQty.toFixed(1)})
              </td>
              <td className="py-4 px-4 text-right text-sm hidden lg:table-cell">
                {batch.yieldPercent > 0 ? (
                  <span
                    className={
                      batch.yieldPercent > 100
                        ? "text-destructive font-medium"
                        : "text-foreground"
                    }
                  >
                    {batch.yieldPercent.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-4 px-4 text-sm text-muted-foreground hidden lg:table-cell">
                {batch.warehouseName}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
