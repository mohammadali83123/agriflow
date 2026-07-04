/**
 * Ledger engine — balance derivation and invoice sync.
 *
 * Golden Rule #6: financial state is derived from ledgers, not mutable numbers.
 * Balance = SUM(invoice.total_minor WHERE status != 'cancelled')
 *           − SUM(payment_allocation.amount_minor)
 */

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { requireOrg } from "@/lib/db/scoped";

type Db = Awaited<ReturnType<typeof requireOrg>>["db"];

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export interface CustomerBalance {
  /** Gross invoiced (excluding cancelled) */
  totalInvoiced: bigint;
  /** Total allocated payments */
  totalPaid: bigint;
  /** totalInvoiced − totalPaid (positive = they owe us) */
  outstanding: bigint;
}

/**
 * Derive a customer's outstanding balance from ledger rows.
 * Never reads a cached column — always sums from live rows.
 */
export async function getCustomerBalance(
  db: Db,
  orgId: string,
  customerId: string
): Promise<CustomerBalance> {
  // SUM of all non-cancelled invoices
  const [invoiceRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${schema.invoice.totalMinor}), 0)`,
    })
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.orgId, orgId),
        eq(schema.invoice.customerId, customerId),
        ne(schema.invoice.status, "cancelled"),
        isNull(schema.invoice.deletedAt)
      )
    );

  // SUM of all payment allocations for this customer's invoices
  const [allocationRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${schema.paymentAllocation.amountMinor}), 0)`,
    })
    .from(schema.paymentAllocation)
    .innerJoin(
      schema.invoice,
      and(
        eq(schema.paymentAllocation.invoiceId, schema.invoice.id),
        eq(schema.invoice.orgId, orgId),
        eq(schema.invoice.customerId, customerId),
        isNull(schema.invoice.deletedAt)
      )
    )
    .where(eq(schema.paymentAllocation.orgId, orgId));

  const totalInvoiced = BigInt(invoiceRow?.total ?? "0");
  const totalPaid = BigInt(allocationRow?.total ?? "0");
  const outstanding = totalInvoiced - totalPaid;

  return { totalInvoiced, totalPaid, outstanding };
}

// ---------------------------------------------------------------------------
// Invoice sync
// ---------------------------------------------------------------------------

/**
 * Recompute amount_paid_minor on an invoice from its payment_allocation rows.
 * Call after every allocation change.
 */
export async function syncInvoicePaidAmount(
  db: Db,
  orgId: string,
  invoiceId: string
): Promise<void> {
  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${schema.paymentAllocation.amountMinor}), 0)`,
    })
    .from(schema.paymentAllocation)
    .where(
      and(
        eq(schema.paymentAllocation.orgId, orgId),
        eq(schema.paymentAllocation.invoiceId, invoiceId)
      )
    );

  const totalPaid = BigInt(row?.total ?? "0");

  await db
    .update(schema.invoice)
    .set({ amountPaidMinor: totalPaid, updatedAt: new Date() })
    .where(
      and(eq(schema.invoice.id, invoiceId), eq(schema.invoice.orgId, orgId))
    );
}

/**
 * Update invoice status based on amount paid vs total:
 *   paid == 0     → keep 'sent' (if was 'partial')
 *   0 < paid < total → 'partial'
 *   paid >= total → 'paid'
 *
 * Never transitions cancelled invoices.
 */
export async function syncInvoiceStatus(
  db: Db,
  orgId: string,
  invoiceId: string
): Promise<void> {
  const [inv] = await db
    .select({
      status: schema.invoice.status,
      totalMinor: schema.invoice.totalMinor,
      amountPaidMinor: schema.invoice.amountPaidMinor,
    })
    .from(schema.invoice)
    .where(
      and(eq(schema.invoice.id, invoiceId), eq(schema.invoice.orgId, orgId))
    )
    .limit(1);

  if (!inv || inv.status === "cancelled" || inv.status === "draft") return;

  const paid = inv.amountPaidMinor;
  const total = inv.totalMinor;

  let newStatus: (typeof schema.invoiceStatusEnum.enumValues)[number];
  if (paid >= total) {
    newStatus = "paid";
  } else if (paid > 0n) {
    newStatus = "partial";
  } else {
    newStatus = "sent";
  }

  if (newStatus !== inv.status) {
    await db
      .update(schema.invoice)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(
        and(eq(schema.invoice.id, invoiceId), eq(schema.invoice.orgId, orgId))
      );
  }
}

/**
 * Recompute and persist subtotal/tax/total from the invoice's lines.
 * Call after any line add/remove or tax rate change.
 */
export async function syncInvoiceTotals(
  db: Db,
  orgId: string,
  invoiceId: string
): Promise<void> {
  const [lineRow] = await db
    .select({
      subtotal: sql<string>`COALESCE(SUM(${schema.invoiceLine.lineTotalMinor}), 0)`,
    })
    .from(schema.invoiceLine)
    .where(
      and(
        eq(schema.invoiceLine.orgId, orgId),
        eq(schema.invoiceLine.invoiceId, invoiceId)
      )
    );

  const subtotal = BigInt(lineRow?.subtotal ?? "0");

  const [inv] = await db
    .select({ taxRate: schema.invoice.taxRate })
    .from(schema.invoice)
    .where(
      and(eq(schema.invoice.id, invoiceId), eq(schema.invoice.orgId, orgId))
    )
    .limit(1);

  const taxRate = inv?.taxRate ? parseFloat(inv.taxRate) : 0;
  const taxMinor = BigInt(Math.round(Number(subtotal) * taxRate));
  const totalMinor = subtotal + taxMinor;

  await db
    .update(schema.invoice)
    .set({
      subtotalMinor: subtotal,
      taxMinor,
      totalMinor,
      updatedAt: new Date(),
    })
    .where(
      and(eq(schema.invoice.id, invoiceId), eq(schema.invoice.orgId, orgId))
    );
}
