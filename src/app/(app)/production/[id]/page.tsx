export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getBatch } from "@/server/production/actions";
import { listProducts } from "@/server/products/actions";
import { BatchDetailClient } from "@/components/production/batch-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const batch = await getBatch(id);
  return {
    title: batch ? `Batch ${batch.batchNumber}` : "Batch not found",
  };
}

export default async function BatchDetailPage({ params }: Props) {
  const { id } = await params;

  const [batch, productsResult] = await Promise.all([
    getBatch(id),
    listProducts(),
  ]);

  if (!batch) notFound();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <Link
        href="/production"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <ChevronLeft className="size-4" />
        Production
      </Link>

      <BatchDetailClient
        batch={batch}
        products={productsResult.data ?? []}
      />
    </div>
  );
}
