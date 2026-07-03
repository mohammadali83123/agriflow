import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export const metadata = { title: "New supplier" };

export default function NewSupplierPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href="/suppliers"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Suppliers
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New supplier</h1>
      <SupplierForm />
    </div>
  );
}
