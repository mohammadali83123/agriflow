import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CustomerForm } from "@/components/customers/customer-form";

export const metadata = { title: "New customer" };

export default function NewCustomerPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="size-4" /> Customers
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New customer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Register a buyer to track orders, credit, and payments.
        </p>
      </div>
      <CustomerForm />
    </div>
  );
}
