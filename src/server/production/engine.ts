/**
 * Production Engine — orchestrates milling batch completion.
 * Calls inventory engine for all stock movements.
 * Never writes inventory_transaction directly.
 */
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { recordStockMovement } from "@/server/inventory/engine";

type DrizzleDb = typeof db;

export interface OutputRow {
  id: string;
  productId: string | null;
  variantId?: string | null;
  quantity: number; // parsed float
  isWaste: boolean;
  basePriceMinor: bigint | null; // for value allocation
}

export interface BatchSummary {
  batchId: string;
  totalInputCostMinor: bigint;
  costPoolMinor: bigint;
  yieldPercent: number;
  outputCosts: Array<{ outputId: string; allocatedCostMinor: bigint }>;
}

// ---------------------------------------------------------------------------
// Pure cost allocation helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Allocate cost pool by relative market value (qty × base_price).
 * Falls back to weight for outputs with no price.
 * Last output absorbs rounding remainder.
 */
export function allocateByCostValue(
  costPool: bigint,
  outputs: OutputRow[]
): bigint[] {
  if (outputs.length === 0) return [];
  if (costPool === 0n) return outputs.map(() => 0n);

  const values = outputs.map((o) =>
    o.basePriceMinor !== null && o.basePriceMinor > 0n
      ? o.quantity * Number(o.basePriceMinor)
      : 0
  );

  const totalValue = values.reduce((a, b) => a + b, 0);

  if (totalValue === 0) {
    return allocateByWeight(costPool, outputs);
  }

  const allocated: bigint[] = [];
  let remaining = costPool;

  for (let i = 0; i < outputs.length; i++) {
    if (i === outputs.length - 1) {
      allocated.push(remaining);
    } else {
      const share = BigInt(Math.round((values[i] / totalValue) * Number(costPool)));
      allocated.push(share);
      remaining -= share;
    }
  }

  return allocated;
}

/**
 * Allocate cost pool by weight (quantity share).
 * Last output absorbs rounding remainder.
 */
export function allocateByWeight(
  costPool: bigint,
  outputs: OutputRow[]
): bigint[] {
  if (outputs.length === 0) return [];
  if (costPool === 0n) return outputs.map(() => 0n);

  const totalQty = outputs.reduce((a, o) => a + o.quantity, 0);

  if (totalQty === 0) {
    return outputs.map(() => 0n);
  }

  const allocated: bigint[] = [];
  let remaining = costPool;

  for (let i = 0; i < outputs.length; i++) {
    if (i === outputs.length - 1) {
      allocated.push(remaining);
    } else {
      const share = BigInt(
        Math.round((outputs[i].quantity / totalQty) * Number(costPool))
      );
      allocated.push(share);
      remaining -= share;
    }
  }

  return allocated;
}

// ---------------------------------------------------------------------------
// Main: complete a batch
// ---------------------------------------------------------------------------

export async function completeBatch(
  dbInstance: DrizzleDb,
  orgId: string,
  batchId: string,
  userId: string
): Promise<BatchSummary> {
  // Load batch
  const [batch] = await dbInstance
    .select()
    .from(schema.productionBatch)
    .where(
      and(
        eq(schema.productionBatch.id, batchId),
        eq(schema.productionBatch.orgId, orgId),
        isNull(schema.productionBatch.deletedAt)
      )
    )
    .limit(1);

  if (!batch) throw new Error("Batch not found");
  if (batch.status === "completed") throw new Error("Batch is already completed");

  // Load inputs
  const inputs = await dbInstance
    .select({
      id: schema.productionInput.id,
      productId: schema.productionInput.productId,
      variantId: schema.productionInput.variantId,
      quantity: schema.productionInput.quantity,
      unitCostMinor: schema.productionInput.unitCostMinor,
    })
    .from(schema.productionInput)
    .where(
      and(
        eq(schema.productionInput.batchId, batchId),
        eq(schema.productionInput.orgId, orgId)
      )
    );

  if (inputs.length === 0) throw new Error("Batch has no inputs");

  // Load outputs with product base price for value allocation
  const outputRows = await dbInstance
    .select({
      id: schema.productionOutput.id,
      productId: schema.productionOutput.productId,
      variantId: schema.productionOutput.variantId,
      quantity: schema.productionOutput.quantity,
      isWaste: schema.productionOutput.isWaste,
      allocatedCostMinor: schema.productionOutput.allocatedCostMinor,
      basePriceMinor: schema.product.basePriceMinor,
    })
    .from(schema.productionOutput)
    .leftJoin(
      schema.product,
      eq(schema.productionOutput.productId, schema.product.id)
    )
    .where(
      and(
        eq(schema.productionOutput.batchId, batchId),
        eq(schema.productionOutput.orgId, orgId)
      )
    );

  if (outputRows.length === 0) throw new Error("Batch has no outputs");

  // Calculate cost pool
  const totalInputCostMinor = inputs.reduce((sum, inp) => {
    const qty = parseFloat(inp.quantity);
    const cost = inp.unitCostMinor ?? 0n;
    return sum + BigInt(Math.round(qty * Number(cost)));
  }, 0n);

  const costPoolMinor = totalInputCostMinor + batch.addedCostMinor;

  // Non-waste outputs for allocation and yield
  const nonWasteOutputs: OutputRow[] = outputRows
    .filter((o) => !o.isWaste)
    .map((o) => ({
      id: o.id,
      productId: o.productId,
      variantId: o.variantId,
      quantity: parseFloat(o.quantity),
      isWaste: false,
      basePriceMinor: o.basePriceMinor !== null ? BigInt(o.basePriceMinor) : null,
    }));

  // Compute allocations
  let allocations: bigint[];

  if (batch.allocationMethod === "manual") {
    // Use already-set allocated_cost_minor from each output
    allocations = nonWasteOutputs.map((o) => {
      const row = outputRows.find((r) => r.id === o.id);
      return row?.allocatedCostMinor ?? 0n;
    });
  } else if (batch.allocationMethod === "weight") {
    allocations = allocateByWeight(costPoolMinor, nonWasteOutputs);
  } else {
    // value (default)
    allocations = allocateByCostValue(costPoolMinor, nonWasteOutputs);
  }

  // Yield %
  const totalInputQty = inputs.reduce(
    (sum, inp) => sum + parseFloat(inp.quantity),
    0
  );
  const totalNonWasteOutputQty = nonWasteOutputs.reduce(
    (sum, o) => sum + o.quantity,
    0
  );
  const yieldPercent =
    totalInputQty > 0 ? (totalNonWasteOutputQty / totalInputQty) * 100 : 0;

  // Build output cost summary
  const outputCosts: BatchSummary["outputCosts"] = nonWasteOutputs.map(
    (o, i) => ({
      outputId: o.id,
      allocatedCostMinor: allocations[i],
    })
  );

  // Step 1: Consume inputs (production_out — negative delta)
  for (const inp of inputs) {
    await recordStockMovement(dbInstance, {
      orgId,
      productId: inp.productId,
      variantId: inp.variantId ?? undefined,
      warehouseId: batch.warehouseId,
      quantityDelta: (-parseFloat(inp.quantity)).toFixed(3),
      type: "production_out",
      refType: "production_batch",
      refId: batchId,
      unitCostMinor: inp.unitCostMinor ?? undefined,
      createdBy: userId,
    });
  }

  // Step 2: Add non-waste outputs (production_in — positive delta)
  for (let i = 0; i < nonWasteOutputs.length; i++) {
    const o = nonWasteOutputs[i];
    if (o.productId === null) continue;
    const allocatedCost = allocations[i];
    const unitCostMinor =
      o.quantity > 0
        ? BigInt(Math.round(Number(allocatedCost) / o.quantity))
        : 0n;

    await recordStockMovement(dbInstance, {
      orgId,
      productId: o.productId,
      variantId: o.variantId ?? undefined,
      warehouseId: batch.warehouseId,
      quantityDelta: o.quantity.toFixed(3),
      type: "production_in",
      refType: "production_batch",
      refId: batchId,
      unitCostMinor,
      createdBy: userId,
    });
  }

  // Step 3: Update allocated costs on outputs
  for (let i = 0; i < nonWasteOutputs.length; i++) {
    await dbInstance
      .update(schema.productionOutput)
      .set({ allocatedCostMinor: allocations[i], updatedAt: new Date() })
      .where(eq(schema.productionOutput.id, nonWasteOutputs[i].id));
  }

  // Step 4: Mark batch completed
  await dbInstance
    .update(schema.productionBatch)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(schema.productionBatch.id, batchId));

  return {
    batchId,
    totalInputCostMinor,
    costPoolMinor,
    yieldPercent,
    outputCosts,
  };
}
