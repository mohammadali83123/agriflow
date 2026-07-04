"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createCustomer, updateCustomer } from "@/server/customers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customer } from "@/lib/db/schema";
import { toRupees } from "@/lib/money";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  businessName: z.string().optional(),
  whatsapp: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  creditLimitRupees: z.number().nonnegative(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type Customer = typeof customer.$inferSelect;
type FormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  customer?: Customer;
}

export function CustomerForm({ customer: existing }: CustomerFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!existing;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existing?.name ?? "",
      phone: existing?.phone ?? "",
      businessName: existing?.businessName ?? undefined,
      whatsapp: existing?.whatsapp ?? undefined,
      city: existing?.city ?? undefined,
      address: existing?.address ?? undefined,
      creditLimitRupees: existing ? toRupees(existing.creditLimitMinor) : 0,
      paymentTerms: existing?.paymentTerms ?? undefined,
      notes: existing?.notes ?? undefined,
      status: existing?.status ?? "active",
    },
  });

  const statusValue = watch("status");

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      if (isEdit && existing) {
        await updateCustomer(existing.id, data);
        router.push(`/customers/${existing.id}`);
      } else {
        await createCustomer(data);
        router.push("/customers");
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {serverError && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* Contact information */}
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Contact information
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Customer name"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+92 300 0000000"
                aria-invalid={!!errors.phone}
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-sm font-medium">
                Business name
              </Label>
              <Input
                id="businessName"
                placeholder="Trading name (optional)"
                {...register("businessName")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-sm font-medium">
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="If different from phone"
                {...register("whatsapp")}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="city" className="text-sm font-medium">City</Label>
              <Input
                id="city"
                placeholder="e.g. Lahore, Faisalabad, Gujranwala"
                {...register("city")}
              />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Financial
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="creditLimitRupees" className="text-sm font-medium">
                Credit limit (Rs)
              </Label>
              <Input
                id="creditLimitRupees"
                type="number"
                step="1"
                min="0"
                placeholder="0"
                aria-invalid={!!errors.creditLimitRupees}
                {...register("creditLimitRupees", { valueAsNumber: true })}
              />
              {errors.creditLimitRupees && (
                <p className="text-xs text-destructive">
                  {errors.creditLimitRupees.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms" className="text-sm font-medium">
                Payment terms
              </Label>
              <Input
                id="paymentTerms"
                placeholder="e.g. COD, 30 days"
                {...register("paymentTerms")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">Status</Label>
              <Select
                value={statusValue ?? "active"}
                onValueChange={(val) =>
                  setValue("status", val as "active" | "inactive")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Additional details */}
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Additional details
          </p>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">Address</Label>
              <Textarea
                id="address"
                placeholder="Street address, area..."
                rows={2}
                {...register("address")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                rows={2}
                {...register("notes")}
              />
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="px-6 py-4 bg-muted/20 flex items-center gap-3">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : isEdit
              ? "Update customer"
              : "Create customer"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
