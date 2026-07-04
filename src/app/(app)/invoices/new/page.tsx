import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCustomersForInvoiceSelect } from "@/server/invoices/actions";
import { NewInvoiceForm } from "@/components/invoices/new-invoice-form";

export const metadata = { title: "New Invoice" };

export default async function NewInvoicePage() {
  const customers = await getCustomersForInvoiceSelect();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="size-4" /> Invoices
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a draft invoice. Add lines after creation.
        </p>
      </div>
      <NewInvoiceForm customers={customers} />
    </div>
  );
}
