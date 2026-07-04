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
        await createSupplier(data);
        router.push("/suppliers");
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
        {/* Basic information */}
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Basic information
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium">
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

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
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

        {/* Contact */}
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Contact
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+92 300 0000000"
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="If different from phone"
                {...register("whatsapp")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms" className="text-sm font-medium">
                Payment terms
              </Label>
              <Input
                id="paymentTerms"
                placeholder="e.g. 30 days, advance"
                {...register("paymentTerms")}
              />
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
                placeholder="Street address, village, area..."
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
              ? "Update supplier"
              : "Create supplier"}
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
