import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getInvoice } from "@/server/invoices/actions";
import { listPayments } from "@/server/payments/actions";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import { InvoiceDetailClient } from "@/components/invoices/invoice-detail-client";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let invoice: Awaited<ReturnType<typeof getInvoice>>;
  try {
    invoice = await getInvoice(id);
  } catch {
    notFound();
  }

  const { role } = await requireOrg();
  const canWrite = can(role, "payments:write");

  // Fetch unallocated payments for this customer for the allocation modal
  const allPayments = await listPayments(invoice.customerId);
  const customerPayments = allPayments.map((p) => ({
    id: p.id,
    paymentNumber: p.paymentNumber,
    amountMinor: p.amountMinor,
    unallocatedMinor: p.unallocatedMinor,
    paymentDate: p.paymentDate,
    method: p.method,
  }));

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="size-4" /> Invoices
        </Link>
      </div>
      <InvoiceDetailClient
        invoice={invoice}
        canWrite={canWrite}
        customerPayments={customerPayments}
      />
    </div>
  );
}
