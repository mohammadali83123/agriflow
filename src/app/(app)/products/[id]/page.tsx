export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProduct } from "@/server/products/actions";
import { ProductForm } from "@/components/products/product-form";
import { VariantForm } from "@/components/products/variant-form";
import { PackagingForm } from "@/components/products/packaging-form";
import { DeleteProductButton } from "@/components/products/delete-product-button";
import { DeleteVariantButton } from "@/components/products/delete-variant-button";
import { DeletePackagingButton } from "@/components/products/delete-packaging-button";

export const metadata = { title: "Edit Product" };

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProduct(id);

  if (!result.data || "error" in result) {
    notFound();
  }

  const product = result.data;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Products
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Base unit: {product.baseUnit}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/products/${id}/price`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Price history
          </Link>
          <DeleteProductButton id={id} />
        </div>
      </div>

      {/* Edit form */}
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="font-medium text-base">Product details</h2>
        <ProductForm product={product} />
      </section>

      {/* Variants */}
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="font-medium text-base">Variants</h2>
        {product.variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No variants yet.</p>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Grade
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Quality
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Brand
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium">{v.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {v.grade ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {v.quality ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {v.brand ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <DeleteVariantButton id={v.id} productId={id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <VariantForm productId={id} />
      </section>

      {/* Packaging options */}
      <section className="rounded-xl border p-5 space-y-4">
        <h2 className="font-medium text-base">Packaging options</h2>
        {product.packaging.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No packaging options yet.
          </p>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Factor ({product.baseUnit} per package)
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {product.packaging.map((pkg) => (
                  <tr
                    key={pkg.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium">{pkg.name}</td>
                    <td className="px-4 py-2.5">{pkg.factor}</td>
                    <td className="px-4 py-2.5 text-right">
                      <DeletePackagingButton id={pkg.id} productId={id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PackagingForm productId={id} baseUnit={product.baseUnit} />
      </section>
    </div>
  );
}
