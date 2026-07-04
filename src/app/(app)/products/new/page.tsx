import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";

export const metadata = { title: "New Product" };
export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="size-4" /> Products
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New product</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a product to your catalogue with base unit and pricing.
        </p>
      </div>
      <ProductForm />
    </div>
  );
}
