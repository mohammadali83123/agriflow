import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CustomerForm } from "@/components/customers/customer-form";

export const metadata = { title: "New customer" };

export default function NewCustomerPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href="/customers"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Customers
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New customer</h1>
      <CustomerForm />
    </div>
  );
}
