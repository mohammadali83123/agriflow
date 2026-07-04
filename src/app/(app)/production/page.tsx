export const dynamic = "force-dynamic";
export const metadata = { title: "Production" };

import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listBatches } from "@/server/production/actions";
import { BatchesTable } from "@/components/production/batches-table";

export default async function ProductionPage() {
  const batches = await listBatches();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Production</h1>
          {batches.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {batches.length} {batches.length === 1 ? "batch" : "batches"}
            </span>
          )}
        </div>
        <Link
          href="/production/new"
          className={cn(buttonVariants({ variant: "default" }), "gap-2")}
        >
          <Plus className="size-4" />
          New batch
        </Link>
      </div>

      <BatchesTable batches={batches} />
    </div>
  );
}
