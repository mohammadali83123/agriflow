export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices" };

import Link from "next/link";
import { listInvoices, type InvoiceStatus } from "@/server/invoices/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/money";

const STATUS_TABS: { label: string; value: InvoiceStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Partial", value: "partial" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
];

function statusBadge(status: InvoiceStatus) {
  const cls: Record<InvoiceStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    partial: "bg-amber-100 text-amber-700",
    paid: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-500 line-through",
  };
  const labels: Record<InvoiceStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    partial: "Partial",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", cls[status])}>
      {labels[status]}
    </span>
  );
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus =
    status && status !== "all" ? (status as InvoiceStatus) : undefined;

  const invoices = await listInvoices(
    activeStatus ? { status: activeStatus } : undefined
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          {invoices.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {invoices.length}
            </span>
          )}
        </div>
        <Link href="/invoices/new" className={buttonVariants()}>
          New invoice
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 border-b overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={
              tab.value === "all" ? "/invoices" : `/invoices?status=${tab.value}`
            }
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              (tab.value === "all" && !activeStatus) ||
                tab.value === activeStatus
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm mt-2">No invoices found.</p>
          <Link
            href="/invoices/new"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
          >
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice #</th>
                <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</th>
                <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Issue Date</th>
                <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due Date</th>
                <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</th>
                <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid</th>
                <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outstanding</th>
                <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="py-3.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="py-4 px-4 font-mono text-sm font-medium">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-4 px-4 text-sm">{inv.customerName}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {inv.issueDate}
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {inv.dueDate ?? "—"}
                  </td>
                  <td className="py-4 px-4 text-sm font-mono tabular-nums text-right font-medium">
                    {formatRupees(inv.totalMinor)}
                  </td>
                  <td className="py-4 px-4 text-sm font-mono tabular-nums text-right text-emerald-700">
                    {formatRupees(inv.amountPaidMinor)}
                  </td>
                  <td className="py-4 px-4 text-sm font-mono tabular-nums text-right font-medium">
                    {inv.outstandingMinor > 0 ? (
                      <span className="text-red-600">
                        {formatRupees(inv.outstandingMinor)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4">{statusBadge(inv.status)}</td>
                  <td className="py-4 px-4 text-right">
                    <Link
                      href={`/invoices/${inv.id}`}
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
