import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export const metadata = { title: "New supplier" };

export default function NewSupplierPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/suppliers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="size-4" /> Suppliers
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New supplier</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Register a farmer, supplier, or trader you purchase from.
        </p>
      </div>
      <SupplierForm />
    </div>
  );
}
