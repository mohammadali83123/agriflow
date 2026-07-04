import { z } from "zod";

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  orderId: z.string().optional(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export const addInvoiceLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPriceRupees: z.number().nonnegative("Unit price must be non-negative"),
  orderLineId: z.string().optional(),
});

export const setInvoiceTaxSchema = z.object({
  taxRatePercent: z.number().min(0).max(100).nullable(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type AddInvoiceLineInput = z.infer<typeof addInvoiceLineSchema>;
