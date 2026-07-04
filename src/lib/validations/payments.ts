import { z } from "zod";

export const createPaymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amountRupees: z.number().positive("Amount must be positive"),
  method: z.enum(["cash", "bank_transfer", "cheque", "online"]).default("cash"),
  paymentDate: z.string().min(1, "Payment date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const allocatePaymentSchema = z.object({
  paymentId: z.string().min(1),
  invoiceId: z.string().min(1),
  amountRupees: z.number().positive("Amount must be positive"),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type AllocatePaymentInput = z.infer<typeof allocatePaymentSchema>;
