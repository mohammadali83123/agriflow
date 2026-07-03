import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  baseUnit: z.string().min(1, "Base unit is required"),
  category: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  minPriceMinor: z.number().int().nonnegative().optional(),
  basePriceMinor: z.number().int().nonnegative().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1, "Variant name is required"),
  grade: z.string().optional(),
  quality: z.string().optional(),
  brand: z.string().optional(),
});

export const createPackagingOptionSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  factor: z.number().positive("Factor must be positive"),
});

export const createDailyPriceSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  priceMinor: z.number().int().nonnegative(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type CreatePackagingOptionInput = z.infer<typeof createPackagingOptionSchema>;
export type CreateDailyPriceInput = z.infer<typeof createDailyPriceSchema>;
