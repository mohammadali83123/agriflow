import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NewOrderForm } from "@/components/orders/new-order-form";
import { getCustomersForSelect } from "@/server/orders/actions";

export const metadata = { title: "New Order" };

export default async function NewOrderPage() {
  const customers = await getCustomersForSelect();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="size-4" /> Orders
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New order</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a draft order. Add lines after creation.
        </p>
      </div>
      <NewOrderForm customers={customers} />
    </div>
  );
}
