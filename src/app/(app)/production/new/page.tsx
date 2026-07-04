export const dynamic = "force-dynamic";
export const metadata = { title: "New Production Batch" };

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listWarehouses } from "@/server/inventory/actions";
import { getNextBatchNumber } from "@/server/production/actions";
import { CreateBatchForm } from "@/components/production/create-batch-form";

export default async function NewBatchPage() {
  const [warehouses, nextBatchNumber] = await Promise.all([
    listWarehouses(),
    getNextBatchNumber(),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link
        href="/production"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ChevronLeft className="size-4" />
        Production
      </Link>

      <h1 className="text-2xl font-bold tracking-tight mb-6">
        New production batch
      </h1>

      <CreateBatchForm
        warehouses={warehouses}
        suggestedBatchNumber={nextBatchNumber}
      />
    </div>
  );
}
