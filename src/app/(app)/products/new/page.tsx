import { ProductForm } from "@/components/products/product-form";

export const metadata = { title: "New Product" };

export default function NewProductPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add a new product to your catalogue.
        </p>
      </div>
      <ProductForm />
    </div>
  );
}

export const dynamic = "force-dynamic";
