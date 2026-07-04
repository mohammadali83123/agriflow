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
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your product catalog and pricing</p>
        </div>
        <Link href="/products/new" className={buttonVariants({ size: "sm" })}>New product</Link>
      </div>
      <ProductsClient products={products} />
    </div>
  );
}
