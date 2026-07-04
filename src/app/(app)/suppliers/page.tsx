export const dynamic = "force-dynamic";
export const metadata = { title: "Suppliers" };

import Link from "next/link";
import { listSuppliers } from "@/server/suppliers/actions";
import { buttonVariants } from "@/components/ui/button";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
          {suppliers.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {suppliers.length}
            </span>
          )}
        </div>
        <Link href="/suppliers/new" className={buttonVariants()}>
          New supplier
        </Link>
      </div>
      <SuppliersTable suppliers={suppliers} />
    </div>
  );
}
