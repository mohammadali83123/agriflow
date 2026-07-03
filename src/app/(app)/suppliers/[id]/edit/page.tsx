import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSupplier } from "@/server/suppliers/actions";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export const metadata = { title: "Edit supplier" };

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let supplier: Awaited<ReturnType<typeof getSupplier>>;
  try {
    supplier = await getSupplier(id);
  } catch {
    notFound();
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href={`/suppliers/${id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {supplier.name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Edit supplier</h1>
      <SupplierForm supplier={supplier} />
    </div>
  );
}
