export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProduct, getPriceHistory } from "@/server/products/actions";
import { PriceForm } from "@/components/products/price-form";
import { formatRupees } from "@/lib/money";

export const metadata = { title: "Price History" };

export default async function PriceHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [productResult, historyResult] = await Promise.all([
    getProduct(id),
    getPriceHistory(id),
  ]);

  if (!productResult.data || "error" in productResult) {
    notFound();
  }

  const product = productResult.data;
  const history = historyResult.data ?? [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/products/${id}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          {product.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Price history</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Price per {product.baseUnit} in rupees (paisa stored)
        </p>
      </div>

      {/* Price entry form */}
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="font-medium text-base">Set today&apos;s price</h2>
        <PriceForm
          productId={id}
          variants={product.variants.map((v) => ({ id: v.id, name: v.name }))}
        />
      </section>

      {/* History table */}
      <section className="space-y-3">
        <h2 className="font-medium text-base">Recent prices (last 30)</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No prices recorded yet.</p>
        ) : (
          <div className="rounded-xl border overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Variant
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Price / {product.baseUnit}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Set by
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => {
                  const variant = product.variants.find(
                    (v) => v.id === row.variantId
                  );
                  return (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">{row.effectiveDate}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {variant?.name ?? "All variants"}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatRupees(row.priceMinor)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.createdByName ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
