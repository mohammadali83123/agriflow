import { z } from "zod";

// ---------------------------------------------------------------------------
// Warehouse
// ---------------------------------------------------------------------------

export const createWarehouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

// ---------------------------------------------------------------------------
// Inventory movements
// ---------------------------------------------------------------------------

// Fields shared by purchase and opening stock
const baseStockEntrySchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  // User enters quantity in base units as a decimal
  quantity: z
    .number()
    .positive("Quantity must be greater than 0"),
  // User enters cost per base unit in rupees; server converts to paisa
  unitCostRupees: z
    .number()
    .nonnegative("Unit cost must be 0 or greater"),
  reason: z.string().optional(),
});

export const recordPurchaseSchema = baseStockEntrySchema.extend({
  supplierId: z.string().optional(),
});

export const recordOpeningStockSchema = baseStockEntrySchema;

export const adjustmentReasonEnum = z.enum([
  "damage",
  "theft",
  "correction",
  "sample",
  "audit",
  "other",
]);

export const recordAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  // Can be positive (add stock) or negative (remove stock)
  quantity: z.number().refine((v) => v !== 0, "Quantity cannot be zero"),
  // Required when quantity is negative
  reason: z.string().optional(),
  notes: z.string().optional(),
});

// Refinement: negative adjustments require a reason
export const recordAdjustmentSchemaWithRefinement = recordAdjustmentSchema.superRefine(
  (data, ctx) => {
    if (data.quantity < 0 && !data.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Reason is required when reducing stock",
      });
    }
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type RecordPurchaseInput = z.infer<typeof recordPurchaseSchema>;
export type RecordOpeningStockInput = z.infer<typeof recordOpeningStockSchema>;
export type RecordAdjustmentInput = z.infer<typeof recordAdjustmentSchema>;
