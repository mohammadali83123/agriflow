/**
 * Inventory Engine — the ONLY module that writes to inventory_transaction.
 *
 * All other code (orders, production, dispatch, etc.) must call these
 * functions. Never insert into inventory_transaction directly.
 *
 * Golden rules enforced here:
 *  - Stock never goes negative (checked before any negative-delta insert).
 *  - Quantities are stored as numeric strings (Drizzle ↔ Postgres).
 *  - Costs are stored as bigint paisa.
 *
 * NOTE: This implementation does NOT use SELECT FOR UPDATE row-level locking.
 * At single-mill scale the race-condition window is acceptable.
 * For production-scale, wrap each write in a transaction with
 * `SELECT SUM(quantity_delta) FROM inventory_transaction WHERE ... FOR UPDATE`.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DrizzleDb = typeof db;

export type InventoryTransactionType =
  typeof schema.inventoryTransactionTypeEnum.enumValues[number];

export type InsertInventoryTransaction = {
  orgId: string;
  productId: string;
  variantId?: string;
  warehouseId: string;
  /** signed numeric string, e.g. "100.000" or "-25.500" */
  quantityDelta: string;
  type: InventoryTransactionType;
  reason?: string;
  refType?: string;
  refId?: string;
  unitCostMinor?: bigint;
  batchId?: string;
  createdBy: string;
};

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Derives current available stock for (product, warehouse, org) by summing
 * all signed quantity_delta rows.  Positive types (purchase, opening, …) are
 * inserted with positive deltas; negative types (sale, dispatch, …) are
 * inserted with negative deltas.  The sum is the on-hand quantity.
 */
export async function getAvailableStock(
  dbInstance: DrizzleDb,
  orgId: string,
  productId: string,
  warehouseId: string
): Promise<number> {
  const [row] = await dbInstance
    .select({
      total: sql<string>`COALESCE(SUM(${schema.inventoryTransaction.quantityDelta}), '0')`,
    })
    .from(schema.inventoryTransaction)
    .where(
      and(
        eq(schema.inventoryTransaction.orgId, orgId),
        eq(schema.inventoryTransaction.productId, productId),
        eq(schema.inventoryTransaction.warehouseId, warehouseId)
      )
    );

  return parseFloat(row?.total ?? "0");
}

/**
 * Weighted-average unit cost: SUM(qty * cost) / SUM(qty) for positive
 * transactions that have a unit_cost_minor set.
 * Returns 0n if no costed transactions exist.
 */
export async function getWeightedAvgCost(
  dbInstance: DrizzleDb,
  orgId: string,
  productId: string,
  warehouseId: string
): Promise<bigint> {
  const [row] = await dbInstance
    .select({
      weightedSum: sql<string>`
        COALESCE(
          SUM(
            ${schema.inventoryTransaction.quantityDelta}::numeric
            * ${schema.inventoryTransaction.unitCostMinor}::numeric
          ),
          '0'
        )`,
      totalQty: sql<string>`
        COALESCE(
          SUM(
            CASE WHEN ${schema.inventoryTransaction.unitCostMinor} IS NOT NULL
              THEN ${schema.inventoryTransaction.quantityDelta}::numeric
              ELSE 0
            END
          ),
          '0'
        )`,
    })
    .from(schema.inventoryTransaction)
    .where(
      and(
        eq(schema.inventoryTransaction.orgId, orgId),
        eq(schema.inventoryTransaction.productId, productId),
        eq(schema.inventoryTransaction.warehouseId, warehouseId),
        sql`${schema.inventoryTransaction.quantityDelta}::numeric > 0`,
        sql`${schema.inventoryTransaction.unitCostMinor} IS NOT NULL`
      )
    );

  const totalQty = parseFloat(row?.totalQty ?? "0");
  if (totalQty === 0) return 0n;

  const weightedSum = parseFloat(row?.weightedSum ?? "0");
  return BigInt(Math.round(weightedSum / totalQty));
}

// ---------------------------------------------------------------------------
// Core write (private)
// ---------------------------------------------------------------------------

/**
 * Insert a single inventory_transaction row.
 * Does NOT validate stock level — callers are responsible for pre-checking.
 */
async function insertTransaction(
  dbInstance: DrizzleDb,
  data: InsertInventoryTransaction
): Promise<typeof schema.inventoryTransaction.$inferSelect> {
  const [row] = await dbInstance
    .insert(schema.inventoryTransaction)
    .values({
      orgId: data.orgId,
      productId: data.productId,
      variantId: data.variantId ?? null,
      warehouseId: data.warehouseId,
      quantityDelta: data.quantityDelta,
      type: data.type,
      reason: data.reason ?? null,
      refType: data.refType ?? null,
      refId: data.refId ?? null,
      unitCostMinor: data.unitCostMinor ?? null,
      batchId: data.batchId ?? null,
      createdBy: data.createdBy,
    })
    .returning();

  return row;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Record any stock movement.
 *
 * If quantityDelta is negative, validates that enough stock is available
 * before inserting.  Throws an Error if the transaction would take stock
 * below zero.
 */
export async function recordStockMovement(
  dbInstance: DrizzleDb,
  params: {
    orgId: string;
    productId: string;
    variantId?: string;
    warehouseId: string;
    /** numeric string — positive or negative */
    quantityDelta: string;
    type: InventoryTransactionType;
    reason?: string;
    refType?: string;
    refId?: string;
    unitCostMinor?: bigint;
    createdBy: string;
  }
): Promise<void> {
  const delta = parseFloat(params.quantityDelta);

  if (delta < 0) {
    const available = await getAvailableStock(
      dbInstance,
      params.orgId,
      params.productId,
      params.warehouseId
    );

    if (available + delta < 0) {
      throw new Error(
        `Insufficient stock: ${available.toFixed(3)} available, ` +
          `tried to remove ${Math.abs(delta).toFixed(3)}`
      );
    }
  }

  await insertTransaction(dbInstance, params);
}
