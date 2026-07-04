"use server";

import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import { toMinor } from "@/lib/money";
import * as schema from "@/lib/db/schema";
import {
  createPaymentSchema,
  allocatePaymentSchema,
} from "@/lib/validations/payments";
import {
  syncInvoicePaidAmount,
  syncInvoiceStatus,
} from "@/server/ledger/engine";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type Db = Awaited<ReturnType<typeof requireOrg>>["db"];

async function generatePaymentNumber(db: Db, orgId: string): Promise<string> {
  const [row] = await db
    .select({ n: count() })
    .from(schema.payment)
    .where(eq(schema.payment.orgId, orgId));
  const n = (row?.n ?? 0) + 1;
  return `PMT-${String(n).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listPayments(customerId?: string) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:read")) throw new Error("Forbidden");

  const conditions = [
    eq(schema.payment.orgId, orgId),
    isNull(schema.payment.deletedAt),
  ];
  if (customerId) {
    conditions.push(eq(schema.payment.customerId, customerId));
  }

  const rows = await db
    .select({
      id: schema.payment.id,
      paymentNumber: schema.payment.paymentNumber,
      customerId: schema.payment.customerId,
      customerName: schema.customer.name,
      amountMinor: schema.payment.amountMinor,
      method: schema.payment.method,
      paymentDate: schema.payment.paymentDate,
      reference: schema.payment.reference,
      createdAt: schema.payment.createdAt,
      allocatedMinor:
        sql<string>`COALESCE((SELECT SUM(amount_minor) FROM payment_allocation WHERE payment_id = ${schema.payment.id} AND org_id = ${schema.payment.orgId}), 0)`,
    })
    .from(schema.payment)
    .innerJoin(
      schema.customer,
      eq(schema.payment.customerId, schema.customer.id)
    )
    .where(and(...conditions))
    .orderBy(desc(schema.payment.createdAt));

  return rows.map((r) => ({
    ...r,
    amountMinor: Number(r.amountMinor),
    allocatedMinor: Number(r.allocatedMinor),
    unallocatedMinor: Number(r.amountMinor) - Number(r.allocatedMinor),
  }));
}

export async function getPayment(id: string) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:read")) throw new Error("Forbidden");

  const [pmt] = await db
    .select({
      id: schema.payment.id,
      paymentNumber: schema.payment.paymentNumber,
      customerId: schema.payment.customerId,
      customerName: schema.customer.name,
      amountMinor: schema.payment.amountMinor,
      method: schema.payment.method,
      paymentDate: schema.payment.paymentDate,
      reference: schema.payment.reference,
      notes: schema.payment.notes,
      createdAt: schema.payment.createdAt,
    })
    .from(schema.payment)
    .innerJoin(
      schema.customer,
      eq(schema.payment.customerId, schema.customer.id)
    )
    .where(
      and(
        eq(schema.payment.id, id),
        eq(schema.payment.orgId, orgId),
        isNull(schema.payment.deletedAt)
      )
    )
    .limit(1);

  if (!pmt) throw new Error("Payment not found");

  const allocations = await db
    .select({
      id: schema.paymentAllocation.id,
      amountMinor: schema.paymentAllocation.amountMinor,
      invoiceId: schema.paymentAllocation.invoiceId,
      invoiceNumber: schema.invoice.invoiceNumber,
      invoiceTotal: schema.invoice.totalMinor,
      invoiceStatus: schema.invoice.status,
      createdAt: schema.paymentAllocation.createdAt,
    })
    .from(schema.paymentAllocation)
    .innerJoin(
      schema.invoice,
      eq(schema.paymentAllocation.invoiceId, schema.invoice.id)
    )
    .where(
      and(
        eq(schema.paymentAllocation.paymentId, id),
        eq(schema.paymentAllocation.orgId, orgId)
      )
    )
    .orderBy(schema.paymentAllocation.createdAt);

  const allocatedMinor = allocations.reduce(
    (s, a) => s + Number(a.amountMinor),
    0
  );

  return {
    ...pmt,
    amountMinor: Number(pmt.amountMinor),
    allocatedMinor,
    unallocatedMinor: Number(pmt.amountMinor) - allocatedMinor,
    allocations: allocations.map((a) => ({
      ...a,
      amountMinor: Number(a.amountMinor),
      invoiceTotal: Number(a.invoiceTotal),
    })),
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createPayment(input: unknown) {
  const { orgId, role, db, session } = await requireOrg();
  if (!can(role, "payments:write")) throw new Error("Forbidden");

  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  // Verify customer
  const [cust] = await db
    .select({ id: schema.customer.id })
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.id, parsed.data.customerId),
        eq(schema.customer.orgId, orgId),
        isNull(schema.customer.deletedAt)
      )
    )
    .limit(1);
  if (!cust) throw new Error("Customer not found");

  const paymentNumber = await generatePaymentNumber(db, orgId);
  const amountMinor = toMinor(parsed.data.amountRupees);

  const [created] = await db
    .insert(schema.payment)
    .values({
      orgId,
      paymentNumber,
      customerId: parsed.data.customerId,
      amountMinor,
      method: parsed.data.method,
      paymentDate: parsed.data.paymentDate,
      reference: parsed.data.reference ?? null,
      notes: parsed.data.notes ?? null,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/payments");
  revalidatePath("/customers");

  return {
    ...created,
    amountMinor: Number(created.amountMinor),
  };
}

export async function allocatePayment(
  paymentId: string,
  invoiceId: string,
  amountRupees: number
) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:write")) throw new Error("Forbidden");

  const parsed = allocatePaymentSchema.safeParse({
    paymentId,
    invoiceId,
    amountRupees,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  // Verify payment belongs to org and is not deleted
  const [pmt] = await db
    .select({ amountMinor: schema.payment.amountMinor, customerId: schema.payment.customerId })
    .from(schema.payment)
    .where(
      and(
        eq(schema.payment.id, paymentId),
        eq(schema.payment.orgId, orgId),
        isNull(schema.payment.deletedAt)
      )
    )
    .limit(1);
  if (!pmt) throw new Error("Payment not found");

  // Verify invoice belongs to org and same customer
  const [inv] = await db
    .select({
      customerId: schema.invoice.customerId,
      status: schema.invoice.status,
      totalMinor: schema.invoice.totalMinor,
    })
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.id, invoiceId),
        eq(schema.invoice.orgId, orgId),
        isNull(schema.invoice.deletedAt)
      )
    )
    .limit(1);
  if (!inv) throw new Error("Invoice not found");
  if (inv.customerId !== pmt.customerId) {
    throw new Error("Payment and invoice must belong to the same customer");
  }
  if (inv.status === "cancelled") {
    throw new Error("Cannot allocate to a cancelled invoice");
  }

  // Check payment has enough unallocated amount
  const [allocRow] = await db
    .select({
      allocated: sql<string>`COALESCE(SUM(amount_minor), 0)`,
    })
    .from(schema.paymentAllocation)
    .where(
      and(
        eq(schema.paymentAllocation.paymentId, paymentId),
        eq(schema.paymentAllocation.orgId, orgId)
      )
    );

  const allocated = BigInt(allocRow?.allocated ?? "0");
  const amountMinor = toMinor(amountRupees);
  const available = pmt.amountMinor - allocated;

  if (amountMinor > available) {
    throw new Error(
      "Allocation amount exceeds available (unallocated) payment amount"
    );
  }

  await db.insert(schema.paymentAllocation).values({
    orgId,
    paymentId,
    invoiceId,
    amountMinor,
  });

  // Sync invoice paid amount and status
  await syncInvoicePaidAmount(db, orgId, invoiceId);
  await syncInvoiceStatus(db, orgId, invoiceId);

  revalidatePath(`/payments/${paymentId}`);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/customers");
}

export async function removeAllocation(allocationId: string) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:write")) throw new Error("Forbidden");

  const [alloc] = await db
    .select({
      id: schema.paymentAllocation.id,
      invoiceId: schema.paymentAllocation.invoiceId,
      paymentId: schema.paymentAllocation.paymentId,
    })
    .from(schema.paymentAllocation)
    .where(
      and(
        eq(schema.paymentAllocation.id, allocationId),
        eq(schema.paymentAllocation.orgId, orgId)
      )
    )
    .limit(1);

  if (!alloc) throw new Error("Allocation not found");

  await db
    .delete(schema.paymentAllocation)
    .where(
      and(
        eq(schema.paymentAllocation.id, allocationId),
        eq(schema.paymentAllocation.orgId, orgId)
      )
    );

  await syncInvoicePaidAmount(db, orgId, alloc.invoiceId);
  await syncInvoiceStatus(db, orgId, alloc.invoiceId);

  revalidatePath(`/payments/${alloc.paymentId}`);
  revalidatePath(`/invoices/${alloc.invoiceId}`);
  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/customers");
}

export async function deletePayment(id: string) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:write")) throw new Error("Forbidden");

  const [pmt] = await db
    .select({ id: schema.payment.id })
    .from(schema.payment)
    .where(
      and(
        eq(schema.payment.id, id),
        eq(schema.payment.orgId, orgId),
        isNull(schema.payment.deletedAt)
      )
    )
    .limit(1);

  if (!pmt) throw new Error("Payment not found");

  // Get all allocations to sync invoices after deletion
  const allocations = await db
    .select({ invoiceId: schema.paymentAllocation.invoiceId })
    .from(schema.paymentAllocation)
    .where(
      and(
        eq(schema.paymentAllocation.paymentId, id),
        eq(schema.paymentAllocation.orgId, orgId)
      )
    );

  // Soft-delete the payment (cascade removes allocations via DB? No — we do it manually)
  // Actually payment_allocation has ON DELETE CASCADE on payment_id FK, but we need to
  // sync invoice status first. Delete allocations manually, then payment.
  const invoiceIds = [...new Set(allocations.map((a) => a.invoiceId))];

  await db
    .delete(schema.paymentAllocation)
    .where(
      and(
        eq(schema.paymentAllocation.paymentId, id),
        eq(schema.paymentAllocation.orgId, orgId)
      )
    );

  await db
    .update(schema.payment)
    .set({ deletedAt: new Date() })
    .where(and(eq(schema.payment.id, id), eq(schema.payment.orgId, orgId)));

  // Sync affected invoices
  for (const invoiceId of invoiceIds) {
    await syncInvoicePaidAmount(db, orgId, invoiceId);
    await syncInvoiceStatus(db, orgId, invoiceId);
  }

  revalidatePath("/payments");
  revalidatePath("/invoices");
  revalidatePath("/customers");
}

// ---------------------------------------------------------------------------
// Select helpers
// ---------------------------------------------------------------------------

export async function getOutstandingInvoicesForCustomer(customerId: string) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:read")) throw new Error("Forbidden");

  const rows = await db
    .select({
      id: schema.invoice.id,
      invoiceNumber: schema.invoice.invoiceNumber,
      totalMinor: schema.invoice.totalMinor,
      amountPaidMinor: schema.invoice.amountPaidMinor,
      issueDate: schema.invoice.issueDate,
      status: schema.invoice.status,
    })
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.orgId, orgId),
        eq(schema.invoice.customerId, customerId),
        isNull(schema.invoice.deletedAt)
      )
    )
    .orderBy(desc(schema.invoice.createdAt));

  return rows
    .filter((r) => r.status !== "cancelled" && r.status !== "draft")
    .map((r) => ({
      ...r,
      totalMinor: Number(r.totalMinor),
      amountPaidMinor: Number(r.amountPaidMinor),
      outstandingMinor: Number(r.totalMinor) - Number(r.amountPaidMinor),
    }));
}
