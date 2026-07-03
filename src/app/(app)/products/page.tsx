import Link from "next/link";
import { listProducts } from "@/server/products/actions";
import { ProductsClient } from "@/components/products/products-client";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const result = await listProducts();
  const products = result.data ?? [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Button render={<Link href="/products/new" />}>New product</Button>
      </div>
      <ProductsClient products={products} />
    </div>
  );
}

export const dynamic = "force-dynamic";
