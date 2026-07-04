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
    draft: "bg-gray-100 text-gray-700",
    confirmed: "bg-blue-100 text-blue-700",
    reserved: "bg-blue-100 text-blue-700",
    ready: "bg-amber-100 text-amber-700",
    dispatched: "bg-green-100 text-green-700",
    delivered: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
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
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", cls[status])}>
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          {orders.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {orders.length}
            </span>
          )}
        </div>
        <Link href="/orders/new" className={buttonVariants()}>
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
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {["Order #", "Customer", "Date", "Status", "Total", ""].map((h) => (
                  <th
                    key={h}
                    className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-4 px-4 font-mono text-sm font-medium">
                    {order.orderNumber}
                  </td>
                  <td className="py-4 px-4 text-sm">{order.customerName}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("en-PK")}
                  </td>
                  <td className="py-4 px-4">{statusBadge(order.status)}</td>
                  <td className="py-4 px-4 text-sm font-medium">
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
      )}
    </div>
  );
}
