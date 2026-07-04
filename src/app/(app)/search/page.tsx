export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

import Link from "next/link";
import { requireOrg } from "@/lib/db/scoped";
import { db } from "@/lib/db";
import { sql, eq, and, isNull, ilike, or } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function searchCustomers(orgId: string, q: string) {
  return db
    .select({
      id: schema.customer.id,
      name: schema.customer.name,
      phone: schema.customer.phone,
      city: schema.customer.city,
    })
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.orgId, orgId),
        isNull(schema.customer.deletedAt),
        or(
          ilike(schema.customer.name, `%${q}%`),
          ilike(schema.customer.phone, `%${q}%`)
        )
      )
    )
    .limit(10);
}

async function searchOrders(orgId: string, q: string) {
  return db
    .select({
      id: schema.order.id,
      orderNumber: schema.order.orderNumber,
      status: schema.order.status,
      customerName: schema.customer.name,
      createdAt: schema.order.createdAt,
    })
    .from(schema.order)
    .innerJoin(schema.customer, eq(schema.order.customerId, schema.customer.id))
    .where(
      and(
        eq(schema.order.orgId, orgId),
        isNull(schema.order.deletedAt),
        ilike(schema.order.orderNumber, `%${q}%`)
      )
    )
    .orderBy(sql`${schema.order.createdAt} DESC`)
    .limit(10);
}

async function searchInvoices(orgId: string, q: string) {
  return db
    .select({
      id: schema.invoice.id,
      invoiceNumber: schema.invoice.invoiceNumber,
      status: schema.invoice.status,
      customerName: schema.customer.name,
      issueDate: schema.invoice.issueDate,
    })
    .from(schema.invoice)
    .innerJoin(schema.customer, eq(schema.invoice.customerId, schema.customer.id))
    .where(
      and(
        eq(schema.invoice.orgId, orgId),
        isNull(schema.invoice.deletedAt),
        ilike(schema.invoice.invoiceNumber, `%${q}%`)
      )
    )
    .orderBy(sql`${schema.invoice.issueDate} DESC`)
    .limit(10);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", confirmed: "Confirmed", reserved: "Reserved",
  ready: "Ready", dispatched: "Dispatched", delivered: "Delivered",
  completed: "Completed", cancelled: "Cancelled",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", partial: "Partial",
  paid: "Paid", overdue: "Overdue", cancelled: "Cancelled",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { orgId } = await requireOrg();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const hasQuery = query.length >= 3;

  const [customers, orders, invoices] = hasQuery
    ? await Promise.all([
        searchCustomers(orgId, query),
        searchOrders(orgId, query),
        searchInvoices(orgId, query),
      ])
    : [[], [], []];

  const totalResults = customers.length + orders.length + invoices.length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        {hasQuery && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalResults === 0
              ? `No results for "${query}"`
              : `${totalResults} result${totalResults !== 1 ? "s" : ""} for "${query}"`}
          </p>
        )}
        {!hasQuery && query.length > 0 && (
          <p className="text-sm text-muted-foreground mt-0.5">
            Type at least 3 characters to search.
          </p>
        )}
      </div>

      {!hasQuery ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border bg-card text-center">
          <p className="text-sm text-muted-foreground">
            Search for customers, orders, or invoices.
          </p>
        </div>
      ) : totalResults === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border bg-card text-center">
          <p className="text-sm font-medium">No results found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search term.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Customers */}
          {customers.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Customers ({customers.length})
              </h2>
              <div className="rounded-xl border overflow-hidden divide-y shadow-sm">
                {customers.map((c) => (
                  <Link
                    key={c.id}
                    href={`/customers/${c.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.phone}{c.city ? ` · ${c.city}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">Customer</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Orders */}
          {orders.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Orders ({orders.length})
              </h2>
              <div className="rounded-xl border overflow-hidden divide-y shadow-sm">
                {orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium font-mono">{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{o.customerName}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Invoices */}
          {invoices.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Invoices ({invoices.length})
              </h2>
              <div className="rounded-xl border overflow-hidden divide-y shadow-sm">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium font-mono">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{inv.customerName}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
