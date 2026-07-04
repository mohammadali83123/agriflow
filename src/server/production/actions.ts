"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import * as schema from "@/lib/db/schema";
import { toMinor } from "@/lib/money";
import {
  createBatchSchema,
  addInputSchema,
  addOutputSchema,
} from "@/lib/validations/production";
import { completeBatch as completeBatchEngine } from "./engine";
import { getWeightedAvgCost } from "@/server/inventory/engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Serializable versions (bigints converted to number for client components)
export type BatchInput = {
  id: string;
  orgId: string;
  batchId: string;
  productId: string;
  variantId: string | null;
  quantity: string;
  unitCostMinor: number | null;
  createdAt: Date;
  updatedAt: Date;
  productName: string;
  baseUnit: string;
};

export type BatchOutput = {
  id: string;
  orgId: string;
  batchId: string;
  productId: string | null;
  variantId: string | null;
  quantity: string;
  allocatedCostMinor: number;
  isWaste: boolean;
  createdAt: Date;
  updatedAt: Date;
  productName: string | null;
};

export type BatchDetail = {
  id: string;
  orgId: string;
  batchNumber: string;
  warehouseId: string;
  productionDate: string;
  addedCostMinor: number;
  allocationMethod: "value" | "weight" | "manual";
  notes: string | null;
  status: "draft" | "completed";
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  warehouseName: string;
  inputs: BatchInput[];
  outputs: BatchOutput[];
};

export type BatchListItem = {
  id: string;
  batchNumber: string;
  productionDate: string;
  status: "draft" | "completed";
  warehouseName: string;
  inputCount: number;
  outputCount: number;
  totalInputQty: number;
  totalOutputQty: number;
  yieldPercent: number;
};

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listBatches(): Promise<BatchListItem[]> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "production:read")) return [];

  const batches = await db
    .select({
      id: schema.productionBatch.id,
      batchNumber: schema.productionBatch.batchNumber,
      productionDate: schema.productionBatch.productionDate,
      status: schema.productionBatch.status,
      warehouseName: schema.warehouse.name,
    })
    .from(schema.productionBatch)
    .innerJoin(
      schema.warehouse,
      eq(schema.productionBatch.warehouseId, schema.warehouse.id)
    )
    .where(
      and(
        eq(schema.productionBatch.orgId, orgId),
        isNull(schema.productionBatch.deletedAt)
      )
    )
    .orderBy(desc(schema.productionBatch.createdAt));

  const result: BatchListItem[] = [];

  for (const b of batches) {
    const inputs = await db
      .select({
        quantity: schema.productionInput.quantity,
      })
      .from(schema.productionInput)
      .where(
        and(
          eq(schema.productionInput.batchId, b.id),
          eq(schema.productionInput.orgId, orgId)
        )
      );

    const outputs = await db
      .select({
        quantity: schema.productionOutput.quantity,
        isWaste: schema.productionOutput.isWaste,
      })
      .from(schema.productionOutput)
      .where(
        and(
          eq(schema.productionOutput.batchId, b.id),
          eq(schema.productionOutput.orgId, orgId)
        )
      );

    const totalInputQty = inputs.reduce(
      (sum, i) => sum + parseFloat(i.quantity),
      0
    );
    const totalNonWasteOutputQty = outputs
      .filter((o) => !o.isWaste)
      .reduce((sum, o) => sum + parseFloat(o.quantity), 0);
    const yieldPercent =
      totalInputQty > 0
        ? (totalNonWasteOutputQty / totalInputQty) * 100
        : 0;

    result.push({
      id: b.id,
      batchNumber: b.batchNumber,
      productionDate: b.productionDate,
      status: b.status,
      warehouseName: b.warehouseName,
      inputCount: inputs.length,
      outputCount: outputs.length,
      totalInputQty,
      totalOutputQty: totalNonWasteOutputQty,
      yieldPercent,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Get single batch
// ---------------------------------------------------------------------------

export async function getBatch(id: string): Promise<BatchDetail | null> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "production:read")) return null;

  const [batch] = await db
    .select({
      id: schema.productionBatch.id,
      orgId: schema.productionBatch.orgId,
      batchNumber: schema.productionBatch.batchNumber,
      warehouseId: schema.productionBatch.warehouseId,
      productionDate: schema.productionBatch.productionDate,
      addedCostMinor: schema.productionBatch.addedCostMinor,
      allocationMethod: schema.productionBatch.allocationMethod,
      notes: schema.productionBatch.notes,
      status: schema.productionBatch.status,
      createdAt: schema.productionBatch.createdAt,
      updatedAt: schema.productionBatch.updatedAt,
      deletedAt: schema.productionBatch.deletedAt,
      createdBy: schema.productionBatch.createdBy,
      warehouseName: schema.warehouse.name,
    })
    .from(schema.productionBatch)
    .innerJoin(
      schema.warehouse,
      eq(schema.productionBatch.warehouseId, schema.warehouse.id)
    )
    .where(
      and(
        eq(schema.productionBatch.id, id),
        eq(schema.productionBatch.orgId, orgId),
        isNull(schema.productionBatch.deletedAt)
      )
    )
    .limit(1);

  if (!batch) return null;

  const inputs = await db
    .select({
      id: schema.productionInput.id,
      orgId: schema.productionInput.orgId,
      batchId: schema.productionInput.batchId,
      productId: schema.productionInput.productId,
      variantId: schema.productionInput.variantId,
      quantity: schema.productionInput.quantity,
      unitCostMinor: schema.productionInput.unitCostMinor,
      createdAt: schema.productionInput.createdAt,
      updatedAt: schema.productionInput.updatedAt,
      productName: schema.product.name,
      baseUnit: schema.product.baseUnit,
    })
    .from(schema.productionInput)
    .innerJoin(
      schema.product,
      eq(schema.productionInput.productId, schema.product.id)
    )
    .where(
      and(
        eq(schema.productionInput.batchId, id),
        eq(schema.productionInput.orgId, orgId)
      )
    )
    .orderBy(schema.productionInput.createdAt);

  const outputs = await db
    .select({
      id: schema.productionOutput.id,
      orgId: schema.productionOutput.orgId,
      batchId: schema.productionOutput.batchId,
      productId: schema.productionOutput.productId,
      variantId: schema.productionOutput.variantId,
      quantity: schema.productionOutput.quantity,
      allocatedCostMinor: schema.productionOutput.allocatedCostMinor,
      isWaste: schema.productionOutput.isWaste,
      createdAt: schema.productionOutput.createdAt,
      updatedAt: schema.productionOutput.updatedAt,
      productName: schema.product.name,
    })
    .from(schema.productionOutput)
    .leftJoin(
      schema.product,
      eq(schema.productionOutput.productId, schema.product.id)
    )
    .where(
      and(
        eq(schema.productionOutput.batchId, id),
        eq(schema.productionOutput.orgId, orgId)
      )
    )
    .orderBy(schema.productionOutput.createdAt);

  // Convert bigints to numbers for client serialization
  return {
    ...batch,
    addedCostMinor: Number(batch.addedCostMinor),
    inputs: inputs.map((inp) => ({
      ...inp,
      unitCostMinor: inp.unitCostMinor !== null ? Number(inp.unitCostMinor) : null,
    })),
    outputs: outputs.map((out) => ({
      ...out,
      allocatedCostMinor: Number(out.allocatedCostMinor),
      productName: out.productName ?? null,
    })),
  };
}

// Serializable batch (bigints converted to number)
export type SerializableBatch = Omit<typeof schema.productionBatch.$inferSelect, "addedCostMinor"> & {
  addedCostMinor: number;
};

// ---------------------------------------------------------------------------
// Create batch
// ---------------------------------------------------------------------------

export async function createBatch(
  input: unknown
): Promise<{ data?: SerializableBatch; error?: unknown }> {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "production:write")) return { error: "Forbidden" };

  const parsed = createBatchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const data = parsed.data;

  const [newBatch] = await db
    .insert(schema.productionBatch)
    .values({
      orgId,
      batchNumber: data.batchNumber,
      warehouseId: data.warehouseId,
      productionDate: data.productionDate,
      addedCostMinor: toMinor(data.addedCostRupees),
      allocationMethod: data.allocationMethod,
      notes: data.notes ?? null,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/production");
  return { data: { ...newBatch, addedCostMinor: Number(newBatch.addedCostMinor) } };
}

// ---------------------------------------------------------------------------
// Add / remove inputs
// ---------------------------------------------------------------------------

export async function addInput(
  batchId: string,
  input: unknown
): Promise<{ error?: unknown }> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "production:write")) return { error: "Forbidden" };

  const parsed = addInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const [batch] = await db
    .select({ status: schema.productionBatch.status, warehouseId: schema.productionBatch.warehouseId })
    .from(schema.productionBatch)
    .where(
      and(
        eq(schema.productionBatch.id, batchId),
        eq(schema.productionBatch.orgId, orgId),
        isNull(schema.productionBatch.deletedAt)
      )
    )
    .limit(1);

  if (!batch) return { error: "Batch not found" };
  if (batch.status !== "draft") return { error: "Cannot modify a completed batch" };

  const data = parsed.data;

  await db.insert(schema.productionInput).values({
    orgId,
    batchId,
    productId: data.productId,
    variantId: data.variantId ?? null,
    quantity: data.quantity.toFixed(3),
    unitCostMinor: toMinor(data.unitCostRupees),
  });

  revalidatePath("/production");
  revalidatePath(`/production/${batchId}`);
  return {};
}

export async function removeInput(inputId: string): Promise<{ error?: unknown }> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "production:write")) return { error: "Forbidden" };

  const [input] = await db
    .select({ batchId: schema.productionInput.batchId })
    .from(schema.productionInput)
    .where(
      and(
        eq(schema.productionInput.id, inputId),
        eq(schema.productionInput.orgId, orgId)
      )
    )
    .limit(1);

  if (!input) return { error: "Input not found" };

  const [batch] = await db
    .select({ status: schema.productionBatch.status })
    .from(schema.productionBatch)
    .where(eq(schema.productionBatch.id, input.batchId))
    .limit(1);

  if (batch?.status !== "draft") return { error: "Cannot modify a completed batch" };

  await db
    .delete(schema.productionInput)
    .where(eq(schema.productionInput.id, inputId));

  revalidatePath("/production");
  revalidatePath(`/production/${input.batchId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Add / remove outputs
// ---------------------------------------------------------------------------

export async function addOutput(
  batchId: string,
  input: unknown
): Promise<{ error?: unknown }> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "production:write")) return { error: "Forbidden" };

  const parsed = addOutputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const [batch] = await db
    .select({ status: schema.productionBatch.status })
    .from(schema.productionBatch)
    .where(
      and(
        eq(schema.productionBatch.id, batchId),
        eq(schema.productionBatch.orgId, orgId),
        isNull(schema.productionBatch.deletedAt)
      )
    )
    .limit(1);

  if (!batch) return { error: "Batch not found" };
  if (batch.status !== "draft") return { error: "Cannot modify a completed batch" };

  const data = parsed.data;

  await db.insert(schema.productionOutput).values({
    orgId,
    batchId,
    productId: data.productId ?? null,
    variantId: data.variantId ?? null,
    quantity: data.quantity.toFixed(3),
    isWaste: data.isWaste,
    allocatedCostMinor:
      data.allocatedCostRupees !== undefined
        ? toMinor(data.allocatedCostRupees)
        : 0n,
  });

  revalidatePath("/production");
  revalidatePath(`/production/${batchId}`);
  return {};
}

export async function removeOutput(outputId: string): Promise<{ error?: unknown }> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "production:write")) return { error: "Forbidden" };

  const [output] = await db
    .select({ batchId: schema.productionOutput.batchId })
    .from(schema.productionOutput)
    .where(
      and(
        eq(schema.productionOutput.id, outputId),
        eq(schema.productionOutput.orgId, orgId)
      )
    )
    .limit(1);

  if (!output) return { error: "Output not found" };

  const [batch] = await db
    .select({ status: schema.productionBatch.status })
    .from(schema.productionBatch)
    .where(eq(schema.productionBatch.id, output.batchId))
    .limit(1);

  if (batch?.status !== "draft") return { error: "Cannot modify a completed batch" };

  await db
    .delete(schema.productionOutput)
    .where(eq(schema.productionOutput.id, outputId));

  revalidatePath("/production");
  revalidatePath(`/production/${output.batchId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Complete batch
// ---------------------------------------------------------------------------

export async function completeBatch(batchId: string): Promise<{ error?: unknown }> {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "production:write")) return { error: "Forbidden" };

  try {
    await completeBatchEngine(db, orgId, batchId, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to complete batch" };
  }

  revalidatePath("/production");
  revalidatePath(`/production/${batchId}`);
  revalidatePath("/inventory");
  return {};
}

// ---------------------------------------------------------------------------
// Delete batch (soft-delete, draft only)
// ---------------------------------------------------------------------------

export async function deleteBatch(id: string): Promise<{ error?: unknown }> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "production:write")) return { error: "Forbidden" };

  const [batch] = await db
    .select({ status: schema.productionBatch.status })
    .from(schema.productionBatch)
    .where(
      and(
        eq(schema.productionBatch.id, id),
        eq(schema.productionBatch.orgId, orgId),
        isNull(schema.productionBatch.deletedAt)
      )
    )
    .limit(1);

  if (!batch) return { error: "Batch not found" };
  if (batch.status !== "draft") return { error: "Cannot delete a completed batch" };

  await db
    .update(schema.productionBatch)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.productionBatch.id, id));

  revalidatePath("/production");
  return {};
}

// ---------------------------------------------------------------------------
// Helper: get next batch number suggestion
// ---------------------------------------------------------------------------

export async function getNextBatchNumber(): Promise<string> {
  const { orgId, db } = await requireOrg();

  const batches = await db
    .select({ batchNumber: schema.productionBatch.batchNumber })
    .from(schema.productionBatch)
    .where(
      and(
        eq(schema.productionBatch.orgId, orgId),
        isNull(schema.productionBatch.deletedAt)
      )
    );

  let maxNum = 0;
  for (const b of batches) {
    const match = b.batchNumber.match(/^BATCH-(\d+)$/i);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }

  return `BATCH-${String(maxNum + 1).padStart(3, "0")}`;
}

export async function getProductCost(
  productId: string,
  warehouseId: string
): Promise<{ costRupees: number }> {
  const { orgId, db } = await requireOrg();
  const costMinor = await getWeightedAvgCost(db, orgId, productId, warehouseId);
  return { costRupees: Number(costMinor) / 100 };
}
