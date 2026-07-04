export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

import { redirect } from "next/navigation";
import Link from "next/link";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { sql, eq, and, isNull } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { formatRupees } from "@/lib/money";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a list of the last 6 month options as YYYY-MM strings, most recent first. */
function buildMonthOptions(): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    options.push({ label, value });
  }
  return options;
}

/** Parse a "YYYY-MM" string into the first and last day of that month (ISO date strings). */
function monthRange(ym: string): { start: string; end: string } {
  const [year, month] = ym.split("-").map(Number);
  const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  // Last day: first day of next month minus 1 day
  const endDate = new Date(year, month, 0);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  partial: "Partial",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  online: "Online",
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchSalesReport(orgId: string, monthRange: { start: string; end: string }) {
  return db
    .select({
      id: schema.invoice.id,
      invoiceNumber: schema.invoice.invoiceNumber,
      customerName: schema.customer.name,
      issueDate: schema.invoice.issueDate,
      subtotalMinor: schema.invoice.subtotalMinor,
      taxMinor: schema.invoice.taxMinor,
      totalMinor: schema.invoice.totalMinor,
      status: schema.invoice.status,
    })
    .from(schema.invoice)
    .innerJoin(schema.customer, eq(schema.invoice.customerId, schema.customer.id))
    .where(
      and(
        eq(schema.invoice.orgId, orgId),
        isNull(schema.invoice.deletedAt),
        sql`${schema.invoice.issueDate} >= ${monthRange.start}`,
        sql`${schema.invoice.issueDate} <= ${monthRange.end}`
      )
    )
    .orderBy(sql`${schema.invoice.issueDate} DESC, ${schema.invoice.invoiceNumber} DESC`);
}

async function fetchPaymentsReport(orgId: string, monthRange: { start: string; end: string }) {
  return db
    .select({
      id: schema.payment.id,
      paymentNumber: schema.payment.paymentNumber,
      customerName: schema.customer.name,
      paymentDate: schema.payment.paymentDate,
      amountMinor: schema.payment.amountMinor,
      method: schema.payment.method,
    })
    .from(schema.payment)
    .innerJoin(schema.customer, eq(schema.payment.customerId, schema.customer.id))
    .where(
      and(
        eq(schema.payment.orgId, orgId),
        isNull(schema.payment.deletedAt),
        sql`${schema.payment.paymentDate} >= ${monthRange.start}`,
        sql`${schema.payment.paymentDate} <= ${monthRange.end}`
      )
    )
    .orderBy(sql`${schema.payment.paymentDate} DESC, ${schema.payment.paymentNumber} DESC`);
}

async function fetchInventoryReport(orgId: string) {
  // Aggregate per product: qty on hand, avg cost
  return db
    .select({
      productId: schema.inventoryTransaction.productId,
      productName: schema.product.name,
      baseUnit: schema.product.baseUnit,
      qtyOnHand: sql<string>`SUM(CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC))`,
      avgCostMinor: sql<string>`CASE WHEN SUM(CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC)) != 0 THEN SUM(CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC) * CAST(COALESCE(${schema.inventoryTransaction.unitCostMinor}, 0) AS NUMERIC)) / NULLIF(SUM(CAST(${schema.inventoryTransaction.quantityDelta} AS NUMERIC)), 0) ELSE 0 END`,
    })
    .from(schema.inventoryTransaction)
    .innerJoin(schema.product, eq(schema.inventoryTransaction.productId, schema.product.id))
    .where(eq(schema.inventoryTransaction.orgId, orgId))
    .groupBy(schema.inventoryTransaction.productId, schema.product.name, schema.product.baseUnit)
    .orderBy(schema.product.name);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const { orgId, role } = await requireOrg();

  if (!can(role, "reports:read")) redirect("/dashboard");

  const { tab, month } = await searchParams;
  const activeTab = tab === "payments" ? "payments" : tab === "inventory" ? "inventory" : "sales";

  const monthOptions = buildMonthOptions();
  const currentMonthValue = monthOptions[0].value;
  const selectedMonth = month && monthOptions.some((m) => m.value === month) ? month : currentMonthValue;
  const range = monthRange(selectedMonth);

  // Fetch data for active tab
  const [salesData, paymentsData, inventoryData] = await Promise.all([
    activeTab === "sales" ? fetchSalesReport(orgId, range) : Promise.resolve(null),
    activeTab === "payments" ? fetchPaymentsReport(orgId, range) : Promise.resolve(null),
    activeTab === "inventory" ? fetchInventoryReport(orgId) : Promise.resolve(null),
  ]);

  const tabs = [
    { value: "sales", label: "Sales" },
    { value: "payments", label: "Payments" },
    { value: "inventory", label: "Inventory" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Financial and operational summary
          </p>
        </div>

        {/* Month selector — hidden on inventory tab */}
        {activeTab !== "inventory" && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Month:
            </span>
            <MonthSelect
              options={monthOptions}
              selected={selectedMonth}
              activeTab={activeTab}
            />
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={`/reports?tab=${t.value}${t.value !== "inventory" ? `&month=${selectedMonth}` : ""}`}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              activeTab === t.value
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "sales" && salesData !== null && (
        <SalesTab data={salesData} />
      )}
      {activeTab === "payments" && paymentsData !== null && (
        <PaymentsTab data={paymentsData} />
      )}
      {activeTab === "inventory" && inventoryData !== null && (
        <InventoryTab data={inventoryData} />
      )}
    </div>
  );
}

// ─── Month select (link-based navigation) ────────────────────────────────────

function MonthSelect({
  options,
  selected,
  activeTab,
}: {
  options: { label: string; value: string }[];
  selected: string;
  activeTab: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <Link
          key={opt.value}
          href={`/reports?tab=${activeTab}&month=${opt.value}`}
          className={cn(
            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
            opt.value === selected
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}

// ─── Sales tab ────────────────────────────────────────────────────────────────

type SalesRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  subtotalMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
  status: string;
};

function SalesTab({ data }: { data: SalesRow[] }) {
  const monthTotal = data.reduce((acc, row) => acc + row.totalMinor, 0n);

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <EmptyState message="No invoices for this month." />
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Invoice #
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Customer
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Date
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Subtotal
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Tax
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Total
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/invoices/${row.id}`}
                          className="font-mono text-sm font-medium hover:underline"
                        >
                          {row.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-sm">{row.customerName}</td>
                      <td className="py-3.5 px-4 text-sm text-muted-foreground">
                        {row.issueDate}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-mono tabular-nums text-right">
                        {formatRupees(row.subtotalMinor)}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-mono tabular-nums text-right text-muted-foreground">
                        {row.taxMinor > 0n ? formatRupees(row.taxMinor) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-mono tabular-nums text-right font-semibold">
                        {formatRupees(row.totalMinor)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            INVOICE_STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-700"
                          )}
                        >
                          {INVOICE_STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/30">
                  <tr>
                    <td
                      colSpan={5}
                      className="py-3 px-4 text-sm font-semibold text-right"
                    >
                      Month total
                    </td>
                    <td className="py-3 px-4 text-sm font-mono tabular-nums text-right font-bold">
                      {formatRupees(monthTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Payments tab ─────────────────────────────────────────────────────────────

type PaymentsRow = {
  id: string;
  paymentNumber: string;
  customerName: string;
  paymentDate: string;
  amountMinor: bigint;
  method: string;
};

function PaymentsTab({ data }: { data: PaymentsRow[] }) {
  const monthTotal = data.reduce((acc, row) => acc + row.amountMinor, 0n);

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <EmptyState message="No payments for this month." />
      ) : (
        <div className="rounded-xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payment #
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Customer
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Date
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Method
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/payments/${row.id}`}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        {row.paymentNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-sm">{row.customerName}</td>
                    <td className="py-3.5 px-4 text-sm text-muted-foreground">
                      {row.paymentDate}
                    </td>
                    <td className="py-3.5 px-4 text-sm text-muted-foreground">
                      {METHOD_LABELS[row.method] ?? row.method}
                    </td>
                    <td className="py-3.5 px-4 text-sm font-mono tabular-nums text-right font-semibold">
                      {formatRupees(row.amountMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td
                    colSpan={4}
                    className="py-3 px-4 text-sm font-semibold text-right"
                  >
                    Month total
                  </td>
                  <td className="py-3 px-4 text-sm font-mono tabular-nums text-right font-bold">
                    {formatRupees(monthTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inventory tab ────────────────────────────────────────────────────────────

type InventoryRow = {
  productId: string;
  productName: string;
  baseUnit: string;
  qtyOnHand: string;
  avgCostMinor: string;
};

function InventoryTab({ data }: { data: InventoryRow[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Current stock snapshot across all warehouses.
      </p>
      {data.length === 0 ? (
        <EmptyState message="No inventory transactions recorded yet." />
      ) : (
        <div className="rounded-xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Product
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Unit
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Qty on Hand
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Avg Cost / Unit
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Stock Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((row) => {
                  const qty = Number(row.qtyOnHand);
                  const avgCost = Math.round(Number(row.avgCostMinor));
                  const stockValue = BigInt(Math.round(qty * avgCost));
                  const isLow = qty < 100;
                  return (
                    <tr key={row.productId} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/products/${row.productId}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {row.productName}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-muted-foreground">
                        {row.baseUnit}
                      </td>
                      <td
                        className={cn(
                          "py-3.5 px-4 text-sm font-mono tabular-nums text-right font-medium",
                          isLow && qty >= 0 ? "text-red-600" : qty < 0 ? "text-red-700 font-bold" : ""
                        )}
                      >
                        {qty.toLocaleString("en-IN", { maximumFractionDigits: 3 })}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-mono tabular-nums text-right text-muted-foreground">
                        {avgCost > 0 ? formatRupees(BigInt(avgCost)) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-sm font-mono tabular-nums text-right font-semibold">
                        {stockValue > 0n ? formatRupees(stockValue) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-xl border bg-card">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
