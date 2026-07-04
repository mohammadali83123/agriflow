export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

import Link from "next/link";
import { listOrders, type OrderStatus } from "@/server/orders/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/money";

const STATUS_TABS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Reserved", value: "reserved" },
  { label: "Ready", value: "ready" },
  { label: "Dispatched", value: "dispatched" },
  { label: "Cancelled", value: "cancelled" },
];

function statusBadge(status: OrderStatus) {
  const cls: Record<OrderStatus, string> = {
    draft: "ring-1 ring-gray-300/60 bg-gray-50 text-gray-600",
    confirmed: "ring-1 ring-blue-400/40 bg-blue-50 text-blue-700",
    reserved: "ring-1 ring-blue-400/40 bg-blue-50 text-blue-700",
    ready: "ring-1 ring-amber-400/40 bg-amber-50 text-amber-700",
    dispatched: "ring-1 ring-emerald-500/30 bg-emerald-50 text-emerald-700",
    delivered: "ring-1 ring-emerald-500/30 bg-emerald-50 text-emerald-700",
    completed: "ring-1 ring-emerald-500/30 bg-emerald-50 text-emerald-700",
    cancelled: "ring-1 ring-red-400/30 bg-red-50 text-red-600",
  };
  const labels: Record<OrderStatus, string> = {
    draft: "Draft",
    confirmed: "Confirmed",
    reserved: "Reserved",
    ready: "Ready",
    dispatched: "Dispatched",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", cls[status])}>
      {labels[status]}
    </span>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus =
    status && status !== "all" ? (status as OrderStatus) : undefined;

  const orders = await listOrders(activeStatus ? { status: activeStatus } : undefined);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track and manage customer orders</p>
        </div>
        <Link href="/orders/new" className={buttonVariants({ size: "sm" })}>
          New order
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 border-b overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/orders" : `/orders?status=${tab.value}`}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              (tab.value === "all" && !activeStatus) || tab.value === activeStatus
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm mt-2">No orders found.</p>
          <Link href="/orders/new" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
            Create your first order
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="py-3.5 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Order #</th>
                <th className="py-3.5 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Customer</th>
                <th className="py-3.5 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="py-3.5 px-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="py-3.5 px-4 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</th>
                <th className="py-3.5 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-4 px-4 font-mono text-sm font-medium">
                    {order.orderNumber}
                  </td>
                  <td className="py-4 px-4 text-sm">{order.customerName}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("en-PK")}
                  </td>
                  <td className="py-4 px-4">{statusBadge(order.status)}</td>
                  <td className="py-4 px-4 text-sm font-mono tabular-nums text-right font-medium">
                    {formatRupees(order.totalMinor)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Link
                      href={`/orders/${order.id}`}
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
