import { z } from "zod";

export const createBatchSchema = z.object({
  batchNumber: z.string().min(1, "Batch number is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  productionDate: z.string().min(1, "Production date is required"),
  addedCostRupees: z.number().nonnegative("Added cost must be 0 or greater").default(0),
  allocationMethod: z.enum(["value", "weight", "manual"]).default("value"),
  notes: z.string().optional(),
});

export const addInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional(),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unitCostRupees: z.number().nonnegative("Unit cost must be 0 or greater"),
});

export const addOutputSchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  quantity: z.number().positive("Quantity must be greater than 0"),
  isWaste: z.boolean().default(false),
  allocatedCostRupees: z.number().nonnegative().optional(),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type AddInputInput = z.infer<typeof addInputSchema>;
export type AddOutputInput = z.infer<typeof addOutputSchema>;
