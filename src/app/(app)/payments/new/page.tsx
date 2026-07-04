import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCustomersForInvoiceSelect } from "@/server/invoices/actions";
import { NewPaymentForm } from "@/components/payments/new-payment-form";

export const metadata = { title: "Record Payment" };

export default async function NewPaymentPage() {
  const customers = await getCustomersForInvoiceSelect();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/payments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="size-4" /> Payments
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Record payment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record a payment received from a customer. Allocate it to invoices after.
        </p>
      </div>
      <NewPaymentForm customers={customers} />
    </div>
  );
}
