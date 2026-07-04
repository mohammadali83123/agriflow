export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

import Link from "next/link";
import { listPayments } from "@/server/payments/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/money";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  online: "Online",
};

export default async function PaymentsPage() {
  const payments = await listPayments();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          {payments.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {payments.length}
            </span>
          )}
        </div>
        <Link href="/payments/new" className={buttonVariants()}>
          Record payment
        </Link>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm mt-2">No payments recorded yet.</p>
          <Link
            href="/payments/new"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
          >
            Record first payment
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment #</th>
                <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</th>
                <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Method</th>
                <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</th>
                <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Allocated</th>
                <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unallocated</th>
                <th className="py-3.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map((pmt) => (
                <tr key={pmt.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-4 px-4 font-mono text-sm font-medium">
                    {pmt.paymentNumber}
                  </td>
                  <td className="py-4 px-4 text-sm">{pmt.customerName}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {pmt.paymentDate}
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {METHOD_LABELS[pmt.method] ?? pmt.method}
                  </td>
                  <td className="py-4 px-4 text-sm font-mono tabular-nums text-right font-medium">
                    {formatRupees(pmt.amountMinor)}
                  </td>
                  <td className="py-4 px-4 text-sm font-mono tabular-nums text-right text-emerald-700">
                    {formatRupees(pmt.allocatedMinor)}
                  </td>
                  <td className="py-4 px-4 text-sm font-mono tabular-nums text-right">
                    {pmt.unallocatedMinor > 0 ? (
                      <span className="text-amber-700">
                        {formatRupees(pmt.unallocatedMinor)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Link
                      href={`/payments/${pmt.id}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
