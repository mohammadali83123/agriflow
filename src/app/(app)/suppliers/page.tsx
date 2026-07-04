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
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your input suppliers</p>
        </div>
        <Link href="/suppliers/new" className={buttonVariants({ size: "sm" })}>
          New supplier
        </Link>
      </div>
      <SuppliersTable suppliers={suppliers} />
    </div>
  );
}
