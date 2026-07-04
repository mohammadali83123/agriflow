import { z } from "zod";

// ---------------------------------------------------------------------------
// Order creation
// ---------------------------------------------------------------------------

export const createOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  deliveryAddressId: z.string().optional(),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Order line
// ---------------------------------------------------------------------------

export const addOrderLineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  qtyOrdered: z.number().positive("Quantity must be positive"),
  packagingOptionId: z.string().optional(),
});

export const removeOrderLineSchema = z.object({
  orderLineId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Order status transitions
// ---------------------------------------------------------------------------

export const confirmOrderSchema = z.object({
  orderId: z.string().min(1),
  // owner may pass creditOverride: true to bypass the credit-limit check
  creditOverride: z.boolean().optional().default(false),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1),
});

export const markReadySchema = z.object({
  orderId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export const createDispatchSchema = z.object({
  method: z.enum(["company_transport", "customer_pickup"]),
  vehicle: z.string().optional(),
  driver: z.string().optional(),
  /** ISO date string, e.g. "2026-07-04" */
  dispatchDate: z.string().min(1, "Dispatch date is required"),
  notes: z.string().optional(),
  lines: z
    .array(
      z.object({
        orderLineId: z.string().min(1),
        quantity: z.number().positive("Quantity must be positive"),
      })
    )
    .min(1, "At least one dispatch line is required"),
});

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddOrderLineInput = z.infer<typeof addOrderLineSchema>;
export type RemoveOrderLineInput = z.infer<typeof removeOrderLineSchema>;
export type ConfirmOrderInput = z.infer<typeof confirmOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type MarkReadyInput = z.infer<typeof markReadySchema>;
export type CreateDispatchInput = z.infer<typeof createDispatchSchema>;
