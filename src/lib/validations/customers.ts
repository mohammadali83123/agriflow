import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  businessName: z.string().optional(),
  whatsapp: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  creditLimitRupees: z.number().nonnegative().default(0),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createContactSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export const createDeliveryAddressSchema = z.object({
  customerId: z.string().min(1),
  label: z.string().min(1, "Label is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type CreateDeliveryAddressInput = z.infer<typeof createDeliveryAddressSchema>;
