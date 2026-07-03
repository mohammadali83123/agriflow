import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCustomer } from "@/server/customers/actions";
import { CustomerForm } from "@/components/customers/customer-form";

export const metadata = { title: "Edit customer" };

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: Awaited<ReturnType<typeof getCustomer>>;
  try {
    data = await getCustomer(id);
  } catch {
    notFound();
  }

  const { contacts: _contacts, addresses: _addresses, ...customer } = data;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href={`/customers/${id}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {customer.name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Edit customer</h1>
      <CustomerForm customer={customer} />
    </div>
  );
}
