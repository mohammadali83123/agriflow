export const dynamic = "force-dynamic";

import {
  ShoppingBag,
  Package,
  Banknote,
  TrendingUp,
  Package2,
  ClipboardList,
  ArrowRight,
  AlertTriangle,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { requireOrg } from "@/lib/db/scoped";
import { getUserOrganizations } from "@/lib/db/scoped";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { sql, eq, and, inArray, isNull } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { formatRupees } from "@/lib/money";

export const metadata = { title: "Dashboard" };

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchOwnerKpis(orgId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  // 1. Sales this month — SUM totalMinor where issueDate >= monthStart and status != cancelled
  const [salesRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${schema.invoice.totalMinor}), 0)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.orgId, orgId),
        isNull(schema.invoice.deletedAt),
        sql`${schema.invoice.issueDate} >= ${monthStart}`,
        sql`${schema.invoice.status} != 'cancelled'`
      )
    );

  // 2. Outstanding — SUM (totalMinor - amountPaidMinor) for sent/partial/overdue
  const [outstandingRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${schema.invoice.totalMinor} - ${schema.invoice.amountPaidMinor}), 0)`,
      count: sql<string>`COUNT(DISTINCT ${schema.invoice.customerId})`,
    })
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.orgId, orgId),
        isNull(schema.invoice.deletedAt),
        inArray(schema.invoice.status, ["sent", "partial", "overdue"])
      )
    );

  // 3. Inventory value — current_qty × weighted-avg incoming cost.
  //    Only positive (inbound) transactions carry a unit cost; outgoing types
  //    (reserve, dispatch, adjustment-out) have unitCostMinor = null.
  //    Formula: SUM(all deltas) × (SUM(in_qty × in_cost) / SUM(in_qty))
  const [inventoryRow] = await db
    .select({
      value: sql<string>`
        COALESCE(
          GREATEST(SUM(CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC)), 0)
          * CASE
              WHEN SUM(CASE WHEN CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC) > 0
                            AND ${schema.inventoryTransaction.unitCostMinor} IS NOT NULL
                       THEN CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC)
                       ELSE 0 END) > 0
              THEN SUM(CASE WHEN CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC) > 0
                            AND ${schema.inventoryTransaction.unitCostMinor} IS NOT NULL
                       THEN CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC)
                            * CAST(${schema.inventoryTransaction.unitCostMinor} AS NUMERIC)
                       ELSE 0 END)
                   / SUM(CASE WHEN CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC) > 0
                               AND ${schema.inventoryTransaction.unitCostMinor} IS NOT NULL
                          THEN CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC)
                          ELSE 0 END)
              ELSE 0
            END,
          0
        )
      `,
    })
    .from(schema.inventoryTransaction)
    .where(eq(schema.inventoryTransaction.orgId, orgId));

  // 4. Low stock items — product_ids where SUM(quantityDelta) < 100
  const lowStockRows = await db
    .select({
      productId: schema.inventoryTransaction.productId,
    })
    .from(schema.inventoryTransaction)
    .where(eq(schema.inventoryTransaction.orgId, orgId))
    .groupBy(schema.inventoryTransaction.productId)
    .having(
      sql`SUM(CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC)) < 100`
    );

  // 5. Pending orders — count with status IN ('confirmed','reserved','ready')
  const [pendingOrdersRow] = await db
    .select({
      count: sql<string>`COUNT(*)`,
    })
    .from(schema.order)
    .where(
      and(
        eq(schema.order.orgId, orgId),
        isNull(schema.order.deletedAt),
        inArray(schema.order.status, ["confirmed", "reserved", "ready"])
      )
    );

  // 6. Today's dispatches
  const [todayDispatchRow] = await db
    .select({
      count: sql<string>`COUNT(*)`,
    })
    .from(schema.dispatch)
    .where(
      and(
        eq(schema.dispatch.orgId, orgId),
        sql`${schema.dispatch.dispatchDate} = ${today}`
      )
    );

  return {
    salesThisMonth: BigInt(salesRow?.total ?? "0"),
    salesCount: Number(salesRow?.count ?? "0"),
    outstanding: BigInt(outstandingRow?.total ?? "0"),
    outstandingCustomers: Number(outstandingRow?.count ?? "0"),
    inventoryValue: BigInt(Math.round(Number(inventoryRow?.value ?? "0"))),
    lowStockCount: lowStockRows.length,
    pendingOrders: Number(pendingOrdersRow?.count ?? "0"),
    todayDispatches: Number(todayDispatchRow?.count ?? "0"),
  };
}

async function fetchTopCustomers(orgId: string) {
  return db
    .select({
      customerId: schema.invoice.customerId,
      name: schema.customer.name,
      outstanding: sql<string>`SUM(${schema.invoice.totalMinor} - ${schema.invoice.amountPaidMinor})`,
    })
    .from(schema.invoice)
    .innerJoin(
      schema.customer,
      eq(schema.invoice.customerId, schema.customer.id)
    )
    .where(
      and(
        eq(schema.invoice.orgId, orgId),
        isNull(schema.invoice.deletedAt),
        inArray(schema.invoice.status, ["sent", "partial", "overdue"])
      )
    )
    .groupBy(schema.invoice.customerId, schema.customer.name)
    .orderBy(
      sql`SUM(${schema.invoice.totalMinor} - ${schema.invoice.amountPaidMinor}) DESC`
    )
    .limit(5);
}

async function fetchRecentOrders(orgId: string) {
  const rows = await db
    .select({
      id: schema.order.id,
      orderNumber: schema.order.orderNumber,
      status: schema.order.status,
      createdAt: schema.order.createdAt,
      customerName: schema.customer.name,
    })
    .from(schema.order)
    .innerJoin(
      schema.customer,
      eq(schema.order.customerId, schema.customer.id)
    )
    .where(
      and(
        eq(schema.order.orgId, orgId),
        isNull(schema.order.deletedAt)
      )
    )
    .orderBy(sql`${schema.order.createdAt} DESC`)
    .limit(5);

  // Fetch line totals for each order
  const orderIds = rows.map((r) => r.id);
  const lineTotals: Record<string, bigint> = {};
  if (orderIds.length > 0) {
    const totalsRows = await db
      .select({
        orderId: schema.orderLine.orderId,
        total: sql<string>`SUM(${schema.orderLine.lineTotalMinor})`,
      })
      .from(schema.orderLine)
      .where(inArray(schema.orderLine.orderId, orderIds))
      .groupBy(schema.orderLine.orderId);
    for (const t of totalsRows) {
      lineTotals[t.orderId] = BigInt(t.total ?? "0");
    }
  }

  return rows.map((r) => ({
    ...r,
    total: lineTotals[r.id] ?? 0n,
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { session, orgId, role } = await requireOrg();
  const orgs = await getUserOrganizations(session.user.id);
  const activeOrg = orgs.find((o) => o.id === orgId);

  const firstName = session.user.name.split(" ")[0];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold tracking-tight">
          {activeOrg?.name ?? "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Good to see you, {firstName}
        </p>
      </div>

      {role === "owner" ? (
        <OwnerDashboard orgId={orgId} />
      ) : (
        <OperatorDashboard />
      )}
    </div>
  );
}

// ─── Owner dashboard ──────────────────────────────────────────────────────────

async function OwnerDashboard({ orgId }: { orgId: string }) {
  const [kpiData, topCustomers, recentOrders] = await Promise.all([
    fetchOwnerKpis(orgId),
    fetchTopCustomers(orgId),
    fetchRecentOrders(orgId),
  ]);

  const kpis = [
    {
      label: "Sales this month",
      value: formatRupees(kpiData.salesThisMonth),
      sub:
        kpiData.salesCount === 0
          ? "No invoices yet"
          : `${kpiData.salesCount} invoice${kpiData.salesCount !== 1 ? "s" : ""}`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Outstanding",
      value: formatRupees(kpiData.outstanding),
      sub:
        kpiData.outstandingCustomers === 0
          ? "No overdue invoices"
          : `${kpiData.outstandingCustomers} customer${kpiData.outstandingCustomers !== 1 ? "s" : ""}`,
      icon: Banknote,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Inventory value",
      value: formatRupees(kpiData.inventoryValue),
      sub:
        kpiData.lowStockCount === 0
          ? "All products stocked"
          : `${kpiData.lowStockCount} low-stock product${kpiData.lowStockCount !== 1 ? "s" : ""}`,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Pending orders",
      value: String(kpiData.pendingOrders),
      sub:
        kpiData.todayDispatches === 0
          ? "No dispatches today"
          : `${kpiData.todayDispatches} dispatch${kpiData.todayDispatches !== 1 ? "es" : ""} today`,
      icon: ShoppingBag,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  const orderStatusLabels: Record<string, string> = {
    draft: "Draft",
    confirmed: "Confirmed",
    reserved: "Reserved",
    ready: "Ready",
    dispatched: "Dispatched",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  const orderStatusColors: Record<string, string> = {
    draft: "ring-1 ring-gray-300/60 bg-gray-50 text-gray-600",
    confirmed: "ring-1 ring-blue-400/40 bg-blue-50 text-blue-700",
    reserved: "ring-1 ring-violet-400/40 bg-violet-50 text-violet-700",
    ready: "ring-1 ring-amber-400/40 bg-amber-50 text-amber-700",
    dispatched: "ring-1 ring-orange-400/40 bg-orange-50 text-orange-700",
    delivered: "ring-1 ring-emerald-500/30 bg-emerald-50 text-emerald-700",
    completed: "ring-1 ring-emerald-500/30 bg-emerald-50 text-emerald-700",
    cancelled: "ring-1 ring-gray-300/60 bg-gray-50 text-gray-400",
  };

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {kpi.label}
                </p>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg",
                    kpi.bg,
                    kpi.color
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
              </div>
              <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Two column: Recent orders + Top customers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent orders */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-semibold">Recent orders</h2>
            <Link
              href="/orders"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted mb-3">
                <ClipboardList className="size-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentOrders.map((ord) => (
                <Link
                  key={ord.id}
                  href={`/orders/${ord.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium font-mono">
                      {ord.orderNumber}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ord.customerName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        orderStatusColors[ord.status] ?? "bg-gray-100 text-gray-700"
                      )}
                    >
                      {orderStatusLabels[ord.status] ?? ord.status}
                    </span>
                    <span className="text-xs font-mono tabular-nums font-medium">
                      {formatRupees(ord.total)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top customers by outstanding */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="text-sm font-semibold">Top customers by outstanding</h2>
            <Link
              href="/customers"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          {topCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted mb-3">
                <AlertTriangle className="size-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No outstanding balances
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {topCustomers.map((c, i) => (
                <Link
                  key={c.customerId}
                  href={`/customers/${c.customerId}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium">{c.name}</p>
                  </div>
                  <span className="text-sm font-mono tabular-nums font-semibold text-red-600">
                    {formatRupees(BigInt(Math.round(Number(c.outstanding))))}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Add products", href: "/products", desc: "Set up your product catalog" },
          { label: "Add customers", href: "/customers", desc: "Register your buyers" },
          { label: "Add suppliers", href: "/suppliers", desc: "Register your input suppliers" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 hover:bg-muted/50 transition-colors group shadow-sm"
          >
            <div>
              <p className="text-sm font-medium">{link.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Operator dashboard ───────────────────────────────────────────────────────

function OperatorDashboard() {
  const actions = [
    {
      label: "Receive Stock",
      desc: "Record a new purchase or stock arrival",
      icon: Package2,
      href: "/inventory/receive",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Process Order",
      desc: "Confirm or dispatch a pending order",
      icon: ClipboardList,
      href: "/orders",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Record Payment",
      desc: "Log a customer payment",
      icon: Banknote,
      href: "/payments/new",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Dispatch Order",
      desc: "Mark goods as loaded and sent",
      icon: Truck,
      href: "/orders?status=ready",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Quick actions
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40 shadow-sm group"
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  action.bg,
                  action.color
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {action.desc}
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
