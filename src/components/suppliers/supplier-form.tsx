"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createSupplier, updateSupplier } from "@/server/suppliers/actions";
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
import { supplier } from "@/lib/db/schema";
import { useState } from "react";

// Local form schema — no .default() to avoid input/output type mismatch with RHF
const formSchema = z.object({
  type: z.enum(["farmer", "supplier", "trader"]),
  name: z.string().min(1, "Name is required"),
  businessName: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type Supplier = typeof supplier.$inferSelect;
type FormValues = z.infer<typeof formSchema>;

interface SupplierFormProps {
  supplier?: Supplier;
}

export function SupplierForm({ supplier: existing }: SupplierFormProps) {
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
      type: existing?.type ?? "supplier",
      name: existing?.name ?? "",
      businessName: existing?.businessName ?? undefined,
      phone: existing?.phone ?? undefined,
      whatsapp: existing?.whatsapp ?? undefined,
      address: existing?.address ?? undefined,
      paymentTerms: existing?.paymentTerms ?? undefined,
      notes: existing?.notes ?? undefined,
      status: existing?.status ?? "active",
    },
  });

  const typeValue = watch("type");
  const statusValue = watch("status");

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      if (isEdit && existing) {
        await updateSupplier(existing.id, data);
        router.push(`/suppliers/${existing.id}`);
      } else {
        const created = await createSupplier(data);
        if (created) {
          router.push(`/suppliers/${created.id}`);
        } else {
          router.push("/suppliers");
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
        {/* Type */}
        <div className="space-y-1.5">
          <Label htmlFor="type">
            Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={typeValue}
            onValueChange={(val) =>
              setValue("type", val as "farmer" | "supplier" | "trader")
            }
          >
            <SelectTrigger className="w-full" aria-invalid={!!errors.type}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="farmer">Farmer</SelectItem>
              <SelectItem value="supplier">Supplier</SelectItem>
              <SelectItem value="trader">Trader</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-xs text-destructive">{errors.type.message}</p>
          )}
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Supplier name"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
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

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+92 300 0000000"
            {...register("phone")}
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

        {/* Payment terms */}
        <div className="space-y-1.5">
          <Label htmlFor="paymentTerms">Payment terms</Label>
          <Input
            id="paymentTerms"
            placeholder="e.g. 30 days, advance"
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
          placeholder="Street address, village, area..."
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
          {isSubmitting ? "Saving..." : isEdit ? "Update supplier" : "Create supplier"}
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
