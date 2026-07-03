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

// Local form schema — no .default() to avoid input/output type mismatch with RHF
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
        const created = await createCustomer(data);
        if (created) {
          router.push(`/customers/${created.id}`);
        } else {
          router.push("/customers");
        }
      }
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">
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

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">
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

        {/* Business name */}
        <div className="space-y-1.5">
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            placeholder="Optional trading name"
            {...register("businessName")}
          />
        </div>

        {/* WhatsApp */}
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp number</Label>
          <Input
            id="whatsapp"
            type="tel"
            placeholder="If different from phone"
            {...register("whatsapp")}
          />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="e.g. Lahore"
            {...register("city")}
          />
        </div>

        {/* Credit limit */}
        <div className="space-y-1.5">
          <Label htmlFor="creditLimitRupees">Credit limit (Rs)</Label>
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

        {/* Payment terms */}
        <div className="space-y-1.5">
          <Label htmlFor="paymentTerms">Payment terms</Label>
          <Input
            id="paymentTerms"
            placeholder="e.g. 30 days, COD"
            {...register("paymentTerms")}
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
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

      {/* Address (full width) */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          placeholder="Street address, area..."
          rows={3}
          {...register("address")}
        />
      </div>

      {/* Notes (full width) */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes..."
          rows={3}
          {...register("notes")}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEdit ? "Update customer" : "Create customer"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
