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
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your customer accounts</p>
        </div>
        <Link href="/customers/new" className={buttonVariants({ size: "sm" })}>
          New customer
        </Link>
      </div>
      <CustomersTable customers={customers} />
    </div>
  );
}
