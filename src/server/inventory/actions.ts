"use server";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import * as schema from "@/lib/db/schema";
import { toMinor } from "@/lib/money";
import {
  createWarehouseSchema,
  updateWarehouseSchema,
  recordPurchaseSchema,
  recordOpeningStockSchema,
  recordAdjustmentSchemaWithRefinement,
} from "@/lib/validations/inventory";
import {
  getAvailableStock,
  getWeightedAvgCost,
  recordStockMovement,
} from "./engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Warehouse = typeof schema.warehouse.$inferSelect;

export type StockLevel = {
  productId: string;
  productName: string;
  baseUnit: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  avgCostMinor: bigint;
  valueMinor: bigint;
};

export type Transaction = {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantityDelta: number;
  type: string;
  reason: string | null;
  unitCostMinor: number | null;
  createdAt: Date;
  createdByName: string | null;
};

// ---------------------------------------------------------------------------
// Warehouses
// ---------------------------------------------------------------------------

export async function listWarehouses(): Promise<Warehouse[]> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "inventory:read")) {
    return [];
  }

  return db
    .select()
    .from(schema.warehouse)
    .where(
      and(
        eq(schema.warehouse.orgId, orgId),
        isNull(schema.warehouse.deletedAt)
      )
    )
    .orderBy(schema.warehouse.name);
}

export async function createWarehouse(input: unknown): Promise<{
  data?: Warehouse;
  error?: unknown;
}> {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "inventory:write")) {
    return { error: "Forbidden" };
  }

  const parsed = createWarehouseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // If this is the first warehouse, make it default automatically
  const [existing] = await db
    .select({ id: schema.warehouse.id })
    .from(schema.warehouse)
    .where(
      and(
        eq(schema.warehouse.orgId, orgId),
        isNull(schema.warehouse.deletedAt)
      )
    )
    .limit(1);

  const isDefault = data.isDefault || !existing;

  // If setting as default, unset other defaults first
  if (isDefault) {
    await db
      .update(schema.warehouse)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.warehouse.orgId, orgId),
          isNull(schema.warehouse.deletedAt)
        )
      );
  }

  const [newWarehouse] = await db
    .insert(schema.warehouse)
    .values({
      orgId,
      name: data.name,
      address: data.address ?? null,
      isDefault,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/inventory");
  revalidatePath("/inventory/warehouses");
  return { data: newWarehouse };
}

export async function updateWarehouse(
  id: string,
  input: unknown
): Promise<{ data?: Warehouse; error?: unknown }> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "inventory:write")) {
    return { error: "Forbidden" };
  }

  const parsed = updateWarehouseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Verify ownership
  const [existing] = await db
    .select({ id: schema.warehouse.id })
    .from(schema.warehouse)
    .where(
      and(
        eq(schema.warehouse.id, id),
        eq(schema.warehouse.orgId, orgId),
        isNull(schema.warehouse.deletedAt)
      )
    )
    .limit(1);

  if (!existing) return { error: "Not found" };

  // If setting as default, unset other defaults first
  if (data.isDefault) {
    await db
      .update(schema.warehouse)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.warehouse.orgId, orgId),
          isNull(schema.warehouse.deletedAt)
        )
      );
  }

  const updateData: Partial<typeof schema.warehouse.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

  const [updated] = await db
    .update(schema.warehouse)
    .set(updateData)
    .where(and(eq(schema.warehouse.id, id), eq(schema.warehouse.orgId, orgId)))
    .returning();

  revalidatePath("/inventory/warehouses");
  return { data: updated };
}

// ---------------------------------------------------------------------------
// Stock levels
// ---------------------------------------------------------------------------

export async function getStockLevels(): Promise<StockLevel[]> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "inventory:read")) {
    return [];
  }

  // Aggregate stock per (product, warehouse)
  const rows = await db
    .select({
      productId: schema.inventoryTransaction.productId,
      productName: schema.product.name,
      baseUnit: schema.product.baseUnit,
      warehouseId: schema.inventoryTransaction.warehouseId,
      warehouseName: schema.warehouse.name,
      totalQty: sql<string>`SUM(${schema.inventoryTransaction.quantityDelta})`,
      // weighted avg cost: SUM(qty * cost) / SUM(qty) for positive transactions with cost
      weightedCostSum: sql<string>`
        COALESCE(
          SUM(
            CASE
              WHEN ${schema.inventoryTransaction.quantityDelta}::numeric > 0
               AND ${schema.inventoryTransaction.unitCostMinor} IS NOT NULL
              THEN ${schema.inventoryTransaction.quantityDelta}::numeric
                   * ${schema.inventoryTransaction.unitCostMinor}::numeric
              ELSE 0
            END
          ),
          0
        )`,
      weightedCostQty: sql<string>`
        COALESCE(
          SUM(
            CASE
              WHEN ${schema.inventoryTransaction.quantityDelta}::numeric > 0
               AND ${schema.inventoryTransaction.unitCostMinor} IS NOT NULL
              THEN ${schema.inventoryTransaction.quantityDelta}::numeric
              ELSE 0
            END
          ),
          0
        )`,
    })
    .from(schema.inventoryTransaction)
    .innerJoin(
      schema.product,
      and(
        eq(schema.inventoryTransaction.productId, schema.product.id),
        isNull(schema.product.deletedAt)
      )
    )
    .innerJoin(
      schema.warehouse,
      and(
        eq(schema.inventoryTransaction.warehouseId, schema.warehouse.id),
        isNull(schema.warehouse.deletedAt)
      )
    )
    .where(eq(schema.inventoryTransaction.orgId, orgId))
    .groupBy(
      schema.inventoryTransaction.productId,
      schema.product.name,
      schema.product.baseUnit,
      schema.inventoryTransaction.warehouseId,
      schema.warehouse.name
    )
    .orderBy(schema.product.name, schema.warehouse.name);

  return rows
    .map((row) => {
      const quantity = parseFloat(row.totalQty ?? "0");
      const weightedQty = parseFloat(row.weightedCostQty ?? "0");
      const weightedSum = parseFloat(row.weightedCostSum ?? "0");
      const avgCostMinor =
        weightedQty > 0
          ? BigInt(Math.round(weightedSum / weightedQty))
          : 0n;
      const valueMinor = BigInt(Math.round(quantity * Number(avgCostMinor)));

      return {
        productId: row.productId,
        productName: row.productName,
        baseUnit: row.baseUnit,
        warehouseId: row.warehouseId,
        warehouseName: row.warehouseName,
        quantity,
        avgCostMinor,
        valueMinor,
      };
    })
    // Show all rows including zero-stock (filtered client-side if needed)
    .filter((row) => row.quantity >= 0);
}

// ---------------------------------------------------------------------------
// Stock movements
// ---------------------------------------------------------------------------

export async function recordPurchase(
  input: unknown
): Promise<{ error?: unknown }> {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "inventory:write")) {
    return { error: "Forbidden" };
  }

  const parsed = recordPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const unitCostMinor = toMinor(data.unitCostRupees);
  const quantityDelta = data.quantity.toFixed(3);

  try {
    await recordStockMovement(db, {
      orgId,
      productId: data.productId,
      variantId: data.variantId,
      warehouseId: data.warehouseId,
      quantityDelta,
      type: "purchase",
      reason: data.reason,
      refType: data.supplierId ? "supplier" : undefined,
      refId: data.supplierId,
      unitCostMinor,
      createdBy: session.user.id,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to record purchase" };
  }

  revalidatePath("/inventory");
  return {};
}

export async function recordOpeningStock(
  input: unknown
): Promise<{ error?: unknown }> {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "inventory:write")) {
    return { error: "Forbidden" };
  }

  const parsed = recordOpeningStockSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const unitCostMinor = toMinor(data.unitCostRupees);
  const quantityDelta = data.quantity.toFixed(3);

  try {
    await recordStockMovement(db, {
      orgId,
      productId: data.productId,
      variantId: data.variantId,
      warehouseId: data.warehouseId,
      quantityDelta,
      type: "opening",
      reason: data.reason,
      unitCostMinor,
      createdBy: session.user.id,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to record opening stock" };
  }

  revalidatePath("/inventory");
  return {};
}

export async function recordAdjustment(
  input: unknown
): Promise<{ error?: unknown }> {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "inventory:write")) {
    return { error: "Forbidden" };
  }

  const parsed = recordAdjustmentSchemaWithRefinement.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  const quantityDelta = data.quantity.toFixed(3);
  const reason = [data.reason, data.notes].filter(Boolean).join(" — ");

  try {
    await recordStockMovement(db, {
      orgId,
      productId: data.productId,
      variantId: data.variantId,
      warehouseId: data.warehouseId,
      quantityDelta,
      type: "adjustment",
      reason: reason || undefined,
      createdBy: session.user.id,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to record adjustment" };
  }

  revalidatePath("/inventory");
  return {};
}

// ---------------------------------------------------------------------------
// Transaction history
// ---------------------------------------------------------------------------

export async function getTransactionHistory(
  productId: string,
  warehouseId?: string
): Promise<Transaction[]> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "inventory:read")) {
    return [];
  }

  const conditions = [
    eq(schema.inventoryTransaction.orgId, orgId),
    eq(schema.inventoryTransaction.productId, productId),
  ];

  if (warehouseId) {
    conditions.push(eq(schema.inventoryTransaction.warehouseId, warehouseId));
  }

  const rows = await db
    .select({
      id: schema.inventoryTransaction.id,
      productId: schema.inventoryTransaction.productId,
      productName: schema.product.name,
      warehouseId: schema.inventoryTransaction.warehouseId,
      warehouseName: schema.warehouse.name,
      quantityDelta: schema.inventoryTransaction.quantityDelta,
      type: schema.inventoryTransaction.type,
      reason: schema.inventoryTransaction.reason,
      unitCostMinor: schema.inventoryTransaction.unitCostMinor,
      createdAt: schema.inventoryTransaction.createdAt,
      createdByName: schema.user.name,
    })
    .from(schema.inventoryTransaction)
    .innerJoin(
      schema.product,
      eq(schema.inventoryTransaction.productId, schema.product.id)
    )
    .innerJoin(
      schema.warehouse,
      eq(schema.inventoryTransaction.warehouseId, schema.warehouse.id)
    )
    .leftJoin(
      schema.user,
      eq(schema.inventoryTransaction.createdBy, schema.user.id)
    )
    .where(and(...conditions))
    .orderBy(desc(schema.inventoryTransaction.createdAt))
    .limit(100);

  return rows.map((row) => ({
    ...row,
    quantityDelta: parseFloat(row.quantityDelta),
    unitCostMinor: row.unitCostMinor !== null ? Number(row.unitCostMinor) : null,
  }));
}
