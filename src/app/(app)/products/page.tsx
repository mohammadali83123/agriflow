export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

import Link from "next/link";
import { listProducts } from "@/server/products/actions";
import { ProductsClient } from "@/components/products/products-client";
import { buttonVariants } from "@/components/ui/button";

export default async function ProductsPage() {
  const result = await listProducts();
  const products = result.data ?? [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          {products.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {products.length}
            </span>
          )}
        </div>
        <Link href="/products/new" className={buttonVariants()}>New product</Link>
      </div>
      <ProductsClient products={products} />
    </div>
  );
}
