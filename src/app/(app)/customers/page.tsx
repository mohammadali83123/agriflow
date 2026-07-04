export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

import Link from "next/link";
import { listCustomers } from "@/server/customers/actions";
import { buttonVariants } from "@/components/ui/button";
import { CustomersTable } from "@/components/customers/customers-table";

export default async function CustomersPage() {
  const customers = await listCustomers();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          {customers.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {customers.length}
            </span>
          )}
        </div>
        <Link href="/customers/new" className={buttonVariants()}>
          New customer
        </Link>
      </div>
      <CustomersTable customers={customers} />
    </div>
  );
}
