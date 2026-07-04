import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getPayment, getOutstandingInvoicesForCustomer } from "@/server/payments/actions";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import { PaymentDetailClient } from "@/components/payments/payment-detail-client";

export const dynamic = "force-dynamic";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let payment: Awaited<ReturnType<typeof getPayment>>;
  try {
    payment = await getPayment(id);
  } catch {
    notFound();
  }

  const { role } = await requireOrg();
  const canWrite = can(role, "payments:write");

  const outstandingInvoices = await getOutstandingInvoicesForCustomer(
    payment.customerId
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/payments"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="size-4" /> Payments
        </Link>
      </div>
      <PaymentDetailClient
        payment={payment}
        canWrite={canWrite}
        outstandingInvoices={outstandingInvoices}
      />
    </div>
  );
}
