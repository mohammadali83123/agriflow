"use server";

import { and, count, desc, eq, isNull, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import * as schema from "@/lib/db/schema";
import { recordStockMovement } from "@/server/inventory/engine";
import {
  createOrderSchema,
  addOrderLineSchema,
  createDispatchSchema,
} from "@/lib/validations/orders";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderStatus = (typeof schema.orderStatusEnum.enumValues)[number];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type Db = Awaited<ReturnType<typeof requireOrg>>["db"];

/**
 * Generate the next order number for this org.
 * Counts ALL orders (including soft-deleted) so numbers never collide.
 */
async function generateOrderNumber(db: Db, orgId: string): Promise<string> {
  const [row] = await db
    .select({ n: count() })
    .from(schema.order)
    .where(eq(schema.order.orgId, orgId));
  const n = (row?.n ?? 0) + 1;
  return `ORD-${String(n).padStart(4, "0")}`;
}

/**
 * Resolve the effective unit price (paisa) for a product/variant.
 *
 * Priority:
 *  1. Daily price with matching variantId for today or earlier (most recent).
 *  2. Daily price with null variantId (product-level) for today or earlier.
 *  3. product.basePriceMinor.
 *
 * Returns { unitPriceMinor, isBelowMin }.
 */
async function resolvePrice(
  db: Db,
  orgId: string,
  productId: string,
  variantId: string | undefined
): Promise<{ unitPriceMinor: bigint; isBelowMin: boolean }> {
  const today = new Date().toISOString().split("T")[0];

  const prices = await db
    .select()
    .from(schema.dailyPrice)
    .where(
      and(
        eq(schema.dailyPrice.orgId, orgId),
        eq(schema.dailyPrice.productId, productId),
        lte(schema.dailyPrice.effectiveDate, today)
      )
    )
    .orderBy(desc(schema.dailyPrice.effectiveDate), desc(schema.dailyPrice.createdAt));

  const matching =
    prices.find((p) => p.variantId === (variantId ?? null)) ??
    prices.find((p) => p.variantId === null) ??
    null;

  const [prod] = await db
    .select({
      basePriceMinor: schema.product.basePriceMinor,
      minPriceMinor: schema.product.minPriceMinor,
    })
    .from(schema.product)
    .where(eq(schema.product.id, productId))
    .limit(1);

  const unitPriceMinor: bigint =
    matching?.priceMinor ?? prod?.basePriceMinor ?? 0n;

  const isBelowMin =
    prod?.minPriceMinor != null && unitPriceMinor < prod.minPriceMinor;

  return { unitPriceMinor, isBelowMin };
}

// ---------------------------------------------------------------------------
// Read actions
// ---------------------------------------------------------------------------

/**
 * List orders for the active org, optionally filtered by status or customerId.
 * Returns orders joined with customer name + aggregated line totals/count.
 */
export async function listOrders(filters?: {
  status?: OrderStatus;
  customerId?: string;
}) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "orders:read")) throw new Error("Forbidden");

  const conditions: Parameters<typeof and>[0][] = [
    eq(schema.order.orgId, orgId),
    isNull(schema.order.deletedAt),
  ];

  if (filters?.status) conditions.push(eq(schema.order.status, filters.status));
  if (filters?.customerId) conditions.push(eq(schema.order.customerId, filters.customerId));

  const rows = await db
    .select({
      id: schema.order.id,
      orderNumber: schema.order.orderNumber,
      status: schema.order.status,
      createdAt: schema.order.createdAt,
      customerId: schema.order.customerId,
      customerName: schema.customer.name,
    })
    .from(schema.order)
    .leftJoin(schema.customer, eq(schema.order.customerId, schema.customer.id))
    .where(and(...conditions))
    .orderBy(desc(schema.order.createdAt));

  if (rows.length === 0) return [];

  // Fetch line totals and counts for all returned orders in one query.
  const orderIds = rows.map((r) => r.id);

  const lineTotals = await db
    .select({
      orderId: schema.orderLine.orderId,
      total: sql<string>`COALESCE(SUM(${schema.orderLine.lineTotalMinor}), '0')`,
      cnt: count(),
    })
    .from(schema.orderLine)
    .where(
      and(
        eq(schema.orderLine.orgId, orgId),
        // Filter to only the orders we retrieved.
        sql`${schema.orderLine.orderId} = ANY(ARRAY[${sql.raw(
          orderIds.map((id) => `'${id}'`).join(",")
        )}]::text[])`
      )
    )
    .groupBy(schema.orderLine.orderId);

  const totalMap = new Map(
    lineTotals.map((t) => [t.orderId, { total: BigInt(t.total), cnt: t.cnt }])
  );

  return rows.map((r) => ({
    ...r,
    totalMinor: totalMap.get(r.id)?.total ?? 0n,
    lineCount: totalMap.get(r.id)?.cnt ?? 0,
  }));
}

/**
 * Return a single order with all details: flat fields, lines (with product/warehouse
 * names), and dispatches (with dispatch lines).
 */
export async function getOrder(orderId: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "orders:read")) throw new Error("Forbidden");

  const [row] = await db
    .select({
      id: schema.order.id,
      orgId: schema.order.orgId,
      orderNumber: schema.order.orderNumber,
      status: schema.order.status,
      notes: schema.order.notes,
      creditOverride: schema.order.creditOverride,
      confirmedAt: schema.order.confirmedAt,
      completedAt: schema.order.completedAt,
      createdAt: schema.order.createdAt,
      updatedAt: schema.order.updatedAt,
      customerId: schema.order.customerId,
      deliveryAddressId: schema.order.deliveryAddressId,
      customerName: schema.customer.name,
      customerPhone: schema.customer.phone,
    })
    .from(schema.order)
    .leftJoin(schema.customer, eq(schema.order.customerId, schema.customer.id))
    .where(
      and(
        eq(schema.order.id, orderId),
        eq(schema.order.orgId, orgId),
        isNull(schema.order.deletedAt)
      )
    )
    .limit(1);

  if (!row) throw new Error("Order not found");

  // Lines with product and warehouse names.
  const lines = await db
    .select({
      id: schema.orderLine.id,
      orderId: schema.orderLine.orderId,
      productId: schema.orderLine.productId,
      productName: schema.product.name,
      productBaseUnit: schema.product.baseUnit,
      variantId: schema.orderLine.variantId,
      warehouseId: schema.orderLine.warehouseId,
      warehouseName: schema.warehouse.name,
      packagingOptionId: schema.orderLine.packagingOptionId,
      qtyOrdered: schema.orderLine.qtyOrdered,
      qtyDispatched: schema.orderLine.qtyDispatched,
      qtyDelivered: schema.orderLine.qtyDelivered,
      unitPriceMinor: schema.orderLine.unitPriceMinor,
      belowMinOverride: schema.orderLine.belowMinOverride,
      lineTotalMinor: schema.orderLine.lineTotalMinor,
    })
    .from(schema.orderLine)
    .leftJoin(schema.product, eq(schema.orderLine.productId, schema.product.id))
    .leftJoin(schema.warehouse, eq(schema.orderLine.warehouseId, schema.warehouse.id))
    .where(eq(schema.orderLine.orderId, orderId));

  // Dispatches.
  const dispatches = await db
    .select({
      id: schema.dispatch.id,
      method: schema.dispatch.method,
      vehicle: schema.dispatch.vehicle,
      driver: schema.dispatch.driver,
      dispatchDate: schema.dispatch.dispatchDate,
      notes: schema.dispatch.notes,
      createdAt: schema.dispatch.createdAt,
    })
    .from(schema.dispatch)
    .where(and(eq(schema.dispatch.orderId, orderId), eq(schema.dispatch.orgId, orgId)))
    .orderBy(desc(schema.dispatch.createdAt));

  // Dispatch lines for each dispatch.
  const dispatchDetails = await Promise.all(
    dispatches.map(async (d) => {
      const dLines = await db
        .select({
          id: schema.dispatchLine.id,
          orderLineId: schema.dispatchLine.orderLineId,
          quantity: schema.dispatchLine.quantity,
        })
        .from(schema.dispatchLine)
        .where(eq(schema.dispatchLine.dispatchId, d.id));
      return { ...d, lines: dLines };
    })
  );

  return { ...row, lines, dispatches: dispatchDetails };
}

// ---------------------------------------------------------------------------
// Mutation actions
// ---------------------------------------------------------------------------

/**
 * Create a new draft order.
 */
export async function createOrder(input: unknown) {
  const { session, orgId, role, db } = await requireOrg();

  if (!can(role, "orders:write")) throw new Error("Forbidden");

  const data = createOrderSchema.parse(input);

  // Verify customer belongs to org.
  const [cust] = await db
    .select({ id: schema.customer.id })
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.id, data.customerId),
        eq(schema.customer.orgId, orgId),
        isNull(schema.customer.deletedAt)
      )
    )
    .limit(1);

  if (!cust) throw new Error("Customer not found");

  const orderNumber = await generateOrderNumber(db, orgId);

  const [newOrder] = await db
    .insert(schema.order)
    .values({
      orgId,
      orderNumber,
      customerId: data.customerId,
      deliveryAddressId: data.deliveryAddressId ?? null,
      notes: data.notes ?? null,
      status: "draft",
      creditOverride: false,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/orders");
  return newOrder;
}

/**
 * Add a line to a draft order.
 * Resolves the price snapshot and inserts.
 */
export async function addOrderLine(orderId: string, input: unknown) {
  const { session, orgId, role, db } = await requireOrg();

  if (!can(role, "orders:write")) throw new Error("Forbidden");

  const data = addOrderLineSchema.parse(input);

  const [ord] = await db
    .select({ status: schema.order.status })
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
  if (ord.status !== "draft") throw new Error("Order is not in draft status");

  const { unitPriceMinor, isBelowMin } = await resolvePrice(
    db,
    orgId,
    data.productId,
    data.variantId
  );

  if (isBelowMin && !can(role, "price:override_min")) {
    throw new Error(
      "Price is below the minimum allowed. Only an owner can override this."
    );
  }

  const lineTotalMinor = BigInt(Math.round(data.qtyOrdered * Number(unitPriceMinor)));

  const [newLine] = await db
    .insert(schema.orderLine)
    .values({
      orgId,
      orderId,
      productId: data.productId,
      variantId: data.variantId ?? null,
      warehouseId: data.warehouseId,
      packagingOptionId: data.packagingOptionId ?? null,
      qtyOrdered: data.qtyOrdered.toFixed(3),
      qtyDispatched: "0.000",
      qtyDelivered: "0.000",
      unitPriceMinor,
      belowMinOverride: isBelowMin,
      lineTotalMinor,
    })
    .returning();

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return newLine;
}

/**
 * Remove a line from a draft order (hard-delete — lines have no deletedAt).
 * Takes a single line ID; verifies the parent order is draft.
 */
export async function removeOrderLine(lineId: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "orders:write")) throw new Error("Forbidden");

  const [line] = await db
    .select({ id: schema.orderLine.id, orderId: schema.orderLine.orderId })
    .from(schema.orderLine)
    .where(and(eq(schema.orderLine.id, lineId), eq(schema.orderLine.orgId, orgId)))
    .limit(1);

  if (!line) throw new Error("Order line not found");

  const [ord] = await db
    .select({ status: schema.order.status })
    .from(schema.order)
    .where(eq(schema.order.id, line.orderId))
    .limit(1);

  if (ord?.status !== "draft") throw new Error("Order is not in draft status");

  await db
    .delete(schema.orderLine)
    .where(and(eq(schema.orderLine.id, lineId), eq(schema.orderLine.orgId, orgId)));

  revalidatePath(`/orders/${line.orderId}`);
  revalidatePath("/orders");
}

/**
 * Confirm a draft order.
 * Reserves stock for every line via the inventory engine.
 * Advances status to 'reserved'.
 */
export async function confirmOrder(orderId: string) {
  const { session, orgId, role, db } = await requireOrg();

  if (!can(role, "orders:confirm")) throw new Error("Forbidden");

  const [ord] = await db
    .select({ status: schema.order.status })
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
  if (ord.status !== "draft") throw new Error("Only draft orders can be confirmed");

  const lines = await db
    .select()
    .from(schema.orderLine)
    .where(eq(schema.orderLine.orderId, orderId));

  if (lines.length === 0) throw new Error("Cannot confirm an order with no lines");

  // TODO Sprint 8: Check customer credit limit against outstanding balance.

  for (const line of lines) {
    await recordStockMovement(db, {
      orgId,
      productId: line.productId,
      variantId: line.variantId ?? undefined,
      warehouseId: line.warehouseId,
      quantityDelta: `${-parseFloat(line.qtyOrdered)}`,
      type: "reserve",
      refType: "order",
      refId: orderId,
      createdBy: session.user.id,
    });
  }

  await db
    .update(schema.order)
    .set({ status: "reserved", confirmedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.order.id, orderId));

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

/**
 * Cancel an order.
 * Releases reserved stock if order was 'reserved' or 'ready'.
 */
export async function cancelOrder(orderId: string) {
  const { session, orgId, role, db } = await requireOrg();

  if (!can(role, "orders:cancel")) throw new Error("Forbidden");

  const [ord] = await db
    .select({ status: schema.order.status })
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

  const cancellable: OrderStatus[] = ["draft", "confirmed", "reserved", "ready"];
  if (!cancellable.includes(ord.status)) {
    throw new Error(`Cannot cancel an order with status '${ord.status}'`);
  }

  if (ord.status === "reserved" || ord.status === "ready") {
    const lines = await db
      .select()
      .from(schema.orderLine)
      .where(eq(schema.orderLine.orderId, orderId));

    for (const line of lines) {
      const qtyToRelease = parseFloat(line.qtyOrdered) - parseFloat(line.qtyDispatched);
      if (qtyToRelease > 0) {
        await recordStockMovement(db, {
          orgId,
          productId: line.productId,
          variantId: line.variantId ?? undefined,
          warehouseId: line.warehouseId,
          quantityDelta: `${qtyToRelease}`,
          type: "release",
          refType: "order",
          refId: orderId,
          createdBy: session.user.id,
        });
      }
    }
  }

  await db
    .update(schema.order)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(schema.order.id, orderId));

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

/**
 * Advance an order from 'reserved' to 'ready'.
 */
export async function markReady(orderId: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "orders:write")) throw new Error("Forbidden");

  const [ord] = await db
    .select({ status: schema.order.status })
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
  if (ord.status !== "reserved") throw new Error("Only reserved orders can be marked ready");

  await db
    .update(schema.order)
    .set({ status: "ready", updatedAt: new Date() })
    .where(eq(schema.order.id, orderId));

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

/**
 * Create a dispatch record and update dispatched quantities.
 * Records inventory movements and advances order status if fully dispatched.
 */
export async function createDispatch(orderId: string, input: unknown) {
  const { session, orgId, role, db } = await requireOrg();

  if (!can(role, "orders:write")) throw new Error("Forbidden");

  const data = createDispatchSchema.parse(input);

  const [ord] = await db
    .select({ status: schema.order.status })
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
  if (ord.status !== "ready" && ord.status !== "reserved") {
    throw new Error("Order must be in 'ready' or 'reserved' status to dispatch");
  }

  const allLines = await db
    .select()
    .from(schema.orderLine)
    .where(eq(schema.orderLine.orderId, orderId));

  const lineMap = new Map(allLines.map((l) => [l.id, l]));

  for (const dl of data.lines) {
    if (!lineMap.has(dl.orderLineId)) {
      throw new Error(`Order line ${dl.orderLineId} not found on this order`);
    }
  }

  const [newDispatch] = await db
    .insert(schema.dispatch)
    .values({
      orgId,
      orderId,
      method: data.method,
      vehicle: data.vehicle ?? null,
      driver: data.driver ?? null,
      dispatchDate: data.dispatchDate,
      notes: data.notes ?? null,
      createdBy: session.user.id,
    })
    .returning();

  for (const dl of data.lines) {
    const line = lineMap.get(dl.orderLineId)!;

    await db.insert(schema.dispatchLine).values({
      orgId,
      dispatchId: newDispatch.id,
      orderLineId: dl.orderLineId,
      quantity: dl.quantity.toFixed(3),
    });

    await recordStockMovement(db, {
      orgId,
      productId: line.productId,
      variantId: line.variantId ?? undefined,
      warehouseId: line.warehouseId,
      quantityDelta: `${-dl.quantity}`,
      type: "dispatch",
      refType: "dispatch",
      refId: newDispatch.id,
      createdBy: session.user.id,
    });

    const newQtyDispatched = (parseFloat(line.qtyDispatched) + dl.quantity).toFixed(3);

    await db
      .update(schema.orderLine)
      .set({ qtyDispatched: newQtyDispatched, updatedAt: new Date() })
      .where(eq(schema.orderLine.id, dl.orderLineId));
  }

  const updatedLines = await db
    .select({
      qtyOrdered: schema.orderLine.qtyOrdered,
      qtyDispatched: schema.orderLine.qtyDispatched,
    })
    .from(schema.orderLine)
    .where(eq(schema.orderLine.orderId, orderId));

  const fullyDispatched = updatedLines.every(
    (l) => parseFloat(l.qtyDispatched) >= parseFloat(l.qtyOrdered)
  );

  if (fullyDispatched) {
    await db
      .update(schema.order)
      .set({ status: "dispatched", updatedAt: new Date() })
      .where(eq(schema.order.id, orderId));
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return newDispatch;
}

/**
 * Soft-delete a draft order. Only owners can delete (orders:cancel permission).
 */
export async function deleteOrder(orderId: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "orders:cancel")) throw new Error("Forbidden");

  const [ord] = await db
    .select({ status: schema.order.status })
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
  if (ord.status !== "draft") {
    throw new Error("Only draft orders can be deleted. Cancel the order first.");
  }

  await db
    .update(schema.order)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.order.id, orderId));

  revalidatePath("/orders");
}

// ---------------------------------------------------------------------------
// Select helpers (for forms)
// ---------------------------------------------------------------------------

export async function getCustomersForSelect() {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "orders:read")) throw new Error("Forbidden");

  return db
    .select({ id: schema.customer.id, name: schema.customer.name, phone: schema.customer.phone })
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

export async function getProductsForSelect() {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "orders:read")) throw new Error("Forbidden");

  return db
    .select({
      id: schema.product.id,
      name: schema.product.name,
      baseUnit: schema.product.baseUnit,
      basePriceMinor: schema.product.basePriceMinor,
      minPriceMinor: schema.product.minPriceMinor,
    })
    .from(schema.product)
    .where(
      and(
        eq(schema.product.orgId, orgId),
        isNull(schema.product.deletedAt),
        eq(schema.product.status, "active")
      )
    )
    .orderBy(schema.product.name);
}

export async function getWarehousesForSelect() {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "orders:read")) throw new Error("Forbidden");

  return db
    .select({ id: schema.warehouse.id, name: schema.warehouse.name })
    .from(schema.warehouse)
    .where(and(eq(schema.warehouse.orgId, orgId), isNull(schema.warehouse.deletedAt)))
    .orderBy(schema.warehouse.name);
}

export async function getDeliveryAddressesForCustomer(customerId: string) {
  const { orgId, role, db } = await requireOrg();
  if (!can(role, "orders:read")) throw new Error("Forbidden");

  return db
    .select()
    .from(schema.customerDeliveryAddress)
    .where(
      and(
        eq(schema.customerDeliveryAddress.customerId, customerId),
        eq(schema.customerDeliveryAddress.orgId, orgId),
        isNull(schema.customerDeliveryAddress.deletedAt)
      )
    )
    .orderBy(schema.customerDeliveryAddress.label);
}
