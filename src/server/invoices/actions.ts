"use server";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import { toMinor } from "@/lib/money";
import * as schema from "@/lib/db/schema";
import {
  createInvoiceSchema,
  addInvoiceLineSchema,
} from "@/lib/validations/invoices";
import {
  syncInvoiceTotals,
  syncInvoicePaidAmount,
  syncInvoiceStatus,
} from "@/server/ledger/engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InvoiceStatus =
  (typeof schema.invoiceStatusEnum.enumValues)[number];

type Db = Awaited<ReturnType<typeof requireOrg>>["db"];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function generateInvoiceNumber(db: Db, orgId: string): Promise<string> {
  const [row] = await db
    .select({ n: count() })
    .from(schema.invoice)
    .where(eq(schema.invoice.orgId, orgId));
  const n = (row?.n ?? 0) + 1;
  return `INV-${String(n).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listInvoices(filters?: {
  customerId?: string;
  status?: InvoiceStatus;
}) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:read")) throw new Error("Forbidden");

  const conditions = [
    eq(schema.invoice.orgId, orgId),
    isNull(schema.invoice.deletedAt),
  ];
  if (filters?.customerId) {
    conditions.push(eq(schema.invoice.customerId, filters.customerId));
  }
  if (filters?.status) {
    conditions.push(eq(schema.invoice.status, filters.status));
  }

  const rows = await db
    .select({
      id: schema.invoice.id,
      invoiceNumber: schema.invoice.invoiceNumber,
      status: schema.invoice.status,
      issueDate: schema.invoice.issueDate,
      dueDate: schema.invoice.dueDate,
      subtotalMinor: schema.invoice.subtotalMinor,
      taxMinor: schema.invoice.taxMinor,
      totalMinor: schema.invoice.totalMinor,
      amountPaidMinor: schema.invoice.amountPaidMinor,
      customerId: schema.invoice.customerId,
      customerName: schema.customer.name,
      createdAt: schema.invoice.createdAt,
    })
    .from(schema.invoice)
    .innerJoin(
      schema.customer,
      eq(schema.invoice.customerId, schema.customer.id)
    )
    .where(and(...conditions))
    .orderBy(desc(schema.invoice.createdAt));

  // Serialize bigints to numbers for client boundary
  return rows.map((r) => ({
    ...r,
    subtotalMinor: Number(r.subtotalMinor),
    taxMinor: Number(r.taxMinor),
    totalMinor: Number(r.totalMinor),
    amountPaidMinor: Number(r.amountPaidMinor),
    outstandingMinor: Number(r.totalMinor) - Number(r.amountPaidMinor),
  }));
}

export async function getInvoice(id: string) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:read")) throw new Error("Forbidden");

  const [inv] = await db
    .select({
      id: schema.invoice.id,
      invoiceNumber: schema.invoice.invoiceNumber,
      status: schema.invoice.status,
      issueDate: schema.invoice.issueDate,
      dueDate: schema.invoice.dueDate,
      subtotalMinor: schema.invoice.subtotalMinor,
      taxRate: schema.invoice.taxRate,
      taxMinor: schema.invoice.taxMinor,
      totalMinor: schema.invoice.totalMinor,
      amountPaidMinor: schema.invoice.amountPaidMinor,
      notes: schema.invoice.notes,
      orderId: schema.invoice.orderId,
      customerId: schema.invoice.customerId,
      customerName: schema.customer.name,
      createdAt: schema.invoice.createdAt,
    })
    .from(schema.invoice)
    .innerJoin(
      schema.customer,
      eq(schema.invoice.customerId, schema.customer.id)
    )
    .where(
      and(
        eq(schema.invoice.id, id),
        eq(schema.invoice.orgId, orgId),
        isNull(schema.invoice.deletedAt)
      )
    )
    .limit(1);

  if (!inv) throw new Error("Invoice not found");

  const lines = await db
    .select()
    .from(schema.invoiceLine)
    .where(
      and(
        eq(schema.invoiceLine.invoiceId, id),
        eq(schema.invoiceLine.orgId, orgId)
      )
    )
    .orderBy(schema.invoiceLine.createdAt);

  // Payment allocations with payment details
  const allocations = await db
    .select({
      id: schema.paymentAllocation.id,
      amountMinor: schema.paymentAllocation.amountMinor,
      paymentId: schema.paymentAllocation.paymentId,
      paymentNumber: schema.payment.paymentNumber,
      paymentDate: schema.payment.paymentDate,
      method: schema.payment.method,
    })
    .from(schema.paymentAllocation)
    .innerJoin(
      schema.payment,
      eq(schema.paymentAllocation.paymentId, schema.payment.id)
    )
    .where(
      and(
        eq(schema.paymentAllocation.invoiceId, id),
        eq(schema.paymentAllocation.orgId, orgId)
      )
    )
    .orderBy(schema.paymentAllocation.createdAt);

  return {
    ...inv,
    subtotalMinor: Number(inv.subtotalMinor),
    taxMinor: Number(inv.taxMinor),
    totalMinor: Number(inv.totalMinor),
    amountPaidMinor: Number(inv.amountPaidMinor),
    lines: lines.map((l) => ({
      ...l,
      unitPriceMinor: Number(l.unitPriceMinor),
      lineTotalMinor: Number(l.lineTotalMinor),
    })),
    allocations: allocations.map((a) => ({
      ...a,
      amountMinor: Number(a.amountMinor),
    })),
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createInvoice(input: unknown) {
  const { orgId, role, db, session } = await requireOrg();
  if (!can(role, "payments:write")) throw new Error("Forbidden");

  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  // Verify customer belongs to org
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

  const invoiceNumber = await generateInvoiceNumber(db, orgId);
  const today = new Date().toISOString().split("T")[0];

  const [created] = await db
    .insert(schema.invoice)
    .values({
      orgId,
      invoiceNumber,
      customerId: parsed.data.customerId,
      orderId: parsed.data.orderId ?? null,
      issueDate: parsed.data.issueDate ?? today,
      dueDate: parsed.data.dueDate ?? null,
      notes: parsed.data.notes ?? null,
      status: "draft",
      subtotalMinor: 0n,
      taxMinor: 0n,
      totalMinor: 0n,
      amountPaidMinor: 0n,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/invoices");
  revalidatePath("/customers");

  return {
    ...created,
    subtotalMinor: Number(created.subtotalMinor),
    taxMinor: Number(created.taxMinor),
    totalMinor: Number(created.totalMinor),
    amountPaidMinor: Number(created.amountPaidMinor),
  };
}

/**
 * Create an invoice pre-populated from an order's lines.
 * Lines are created as invoice lines with order line traceability.
 */
export async function createInvoiceFromOrder(orderId: string) {
  const { orgId, role, db, session } = await requireOrg();
  if (!can(role, "payments:write")) throw new Error("Forbidden");

  const [ord] = await db
    .select({
      id: schema.order.id,
      customerId: schema.order.customerId,
      status: schema.order.status,
    })
    .from(schema.order)
    .where(
      and(
        eq(schema.order.id, orderId),
        eq(schema.order.orgId, orgId),
        isNull(schema.order.deletedAt)
      )
    )
    .limit(1);

  if (!ord) throw new Error("Order not found");

  const orderLines = await db
    .select({
      id: schema.orderLine.id,
      productId: schema.orderLine.productId,
      qtyOrdered: schema.orderLine.qtyOrdered,
      unitPriceMinor: schema.orderLine.unitPriceMinor,
      lineTotalMinor: schema.orderLine.lineTotalMinor,
      productName: schema.product.name,
    })
    .from(schema.orderLine)
    .innerJoin(schema.product, eq(schema.orderLine.productId, schema.product.id))
    .where(
      and(
        eq(schema.orderLine.orderId, orderId),
        eq(schema.orderLine.orgId, orgId)
      )
    );

  const invoiceNumber = await generateInvoiceNumber(db, orgId);
  const today = new Date().toISOString().split("T")[0];

  const subtotalMinor = orderLines.reduce(
    (s, l) => s + BigInt(l.lineTotalMinor),
    0n
  );

  const [created] = await db
    .insert(schema.invoice)
    .values({
      orgId,
      invoiceNumber,
      customerId: ord.customerId,
      orderId,
      issueDate: today,
      status: "draft",
      subtotalMinor,
      taxMinor: 0n,
      totalMinor: subtotalMinor,
      amountPaidMinor: 0n,
      createdBy: session.user.id,
    })
    .returning();

  // Insert lines
  if (orderLines.length > 0) {
    await db.insert(schema.invoiceLine).values(
      orderLines.map((l) => ({
        orgId,
        invoiceId: created.id,
        description: l.productName,
        quantity: l.qtyOrdered,
        unitPriceMinor: l.unitPriceMinor,
        lineTotalMinor: l.lineTotalMinor,
        orderLineId: l.id,
      }))
    );
  }

  revalidatePath("/invoices");
  revalidatePath("/customers");

  return {
    ...created,
    subtotalMinor: Number(created.subtotalMinor),
    taxMinor: Number(created.taxMinor),
    totalMinor: Number(created.totalMinor),
    amountPaidMinor: Number(created.amountPaidMinor),
  };
}

export async function addInvoiceLine(invoiceId: string, input: unknown) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:write")) throw new Error("Forbidden");

  const parsed = addInvoiceLineSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const [inv] = await db
    .select({ id: schema.invoice.id, status: schema.invoice.status })
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
  if (inv.status !== "draft") throw new Error("Can only edit draft invoices");

  const unitPriceMinor = toMinor(parsed.data.unitPriceRupees);
  // qty * unitPriceMinor — quantity is a number here
  const lineTotalMinor = BigInt(
    Math.round(parsed.data.quantity * Number(unitPriceMinor))
  );

  await db.insert(schema.invoiceLine).values({
    orgId,
    invoiceId,
    description: parsed.data.description,
    quantity: String(parsed.data.quantity),
    unitPriceMinor,
    lineTotalMinor,
    orderLineId: parsed.data.orderLineId ?? null,
  });

  await syncInvoiceTotals(db, orgId, invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function removeInvoiceLine(lineId: string) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:write")) throw new Error("Forbidden");

  const [line] = await db
    .select({
      id: schema.invoiceLine.id,
      invoiceId: schema.invoiceLine.invoiceId,
    })
    .from(schema.invoiceLine)
    .where(
      and(
        eq(schema.invoiceLine.id, lineId),
        eq(schema.invoiceLine.orgId, orgId)
      )
    )
    .limit(1);

  if (!line) throw new Error("Line not found");

  // Verify invoice is draft
  const [inv] = await db
    .select({ status: schema.invoice.status })
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.id, line.invoiceId),
        eq(schema.invoice.orgId, orgId)
      )
    )
    .limit(1);

  if (inv?.status !== "draft") throw new Error("Can only edit draft invoices");

  await db
    .delete(schema.invoiceLine)
    .where(
      and(
        eq(schema.invoiceLine.id, lineId),
        eq(schema.invoiceLine.orgId, orgId)
      )
    );

  await syncInvoiceTotals(db, orgId, line.invoiceId);

  revalidatePath(`/invoices/${line.invoiceId}`);
  revalidatePath("/invoices");
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: "sent" | "cancelled"
) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:write")) throw new Error("Forbidden");

  const [inv] = await db
    .select({ status: schema.invoice.status })
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

  if (status === "sent" && inv.status !== "draft") {
    throw new Error("Only draft invoices can be marked as sent");
  }
  if (status === "cancelled" && inv.status === "paid") {
    throw new Error("Cannot cancel a fully paid invoice");
  }

  await db
    .update(schema.invoice)
    .set({ status, updatedAt: new Date() })
    .where(
      and(eq(schema.invoice.id, invoiceId), eq(schema.invoice.orgId, orgId))
    );

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/customers");
}

export async function setInvoiceTax(
  invoiceId: string,
  taxRatePercent: number | null
) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:write")) throw new Error("Forbidden");

  const [inv] = await db
    .select({ status: schema.invoice.status })
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
  if (inv.status !== "draft") throw new Error("Can only edit draft invoices");

  // taxRatePercent=17 → taxRate=0.1700
  const taxRate =
    taxRatePercent !== null ? String(taxRatePercent / 100) : null;

  await db
    .update(schema.invoice)
    .set({ taxRate, updatedAt: new Date() })
    .where(
      and(eq(schema.invoice.id, invoiceId), eq(schema.invoice.orgId, orgId))
    );

  await syncInvoiceTotals(db, orgId, invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function deleteInvoice(id: string) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "payments:write")) throw new Error("Forbidden");

  const [inv] = await db
    .select({ status: schema.invoice.status })
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.id, id),
        eq(schema.invoice.orgId, orgId),
        isNull(schema.invoice.deletedAt)
      )
    )
    .limit(1);

  if (!inv) throw new Error("Invoice not found");
  if (inv.status !== "draft") throw new Error("Only draft invoices can be deleted");

  await db
    .update(schema.invoice)
    .set({ deletedAt: new Date() })
    .where(and(eq(schema.invoice.id, id), eq(schema.invoice.orgId, orgId)));

  revalidatePath("/invoices");
  revalidatePath("/customers");
}

// ---------------------------------------------------------------------------
// Select helpers for forms
// ---------------------------------------------------------------------------

export async function getCustomersForInvoiceSelect() {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "customers:read")) throw new Error("Forbidden");

  return db
    .select({
      id: schema.customer.id,
      name: schema.customer.name,
      phone: schema.customer.phone,
    })
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.orgId, orgId),
        isNull(schema.customer.deletedAt),
        eq(schema.customer.status, "active")
      )
    )
    .orderBy(schema.customer.name);
}
