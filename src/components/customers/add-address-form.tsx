"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDeliveryAddress } from "@/server/customers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const schema = z.object({
  customerId: z.string().min(1),
  label: z.string().min(1, "Label is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  isDefault: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface AddAddressFormProps {
  customerId: string;
}

export function AddAddressForm({ customerId }: AddAddressFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { customerId, isDefault: false },
  });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      await addDeliveryAddress(data);
      reset({ customerId, isDefault: false });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Add address
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border p-4 space-y-4 max-w-lg">
      <input type="hidden" {...register("customerId")} />

      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="addr-label">
            Label <span className="text-destructive">*</span>
          </Label>
          <Input
            id="addr-label"
            placeholder="e.g. Main Warehouse, City Store"
            aria-invalid={!!errors.label}
            {...register("label")}
          />
          {errors.label && (
            <p className="text-xs text-destructive">{errors.label.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="addr-city">City</Label>
          <Input
            id="addr-city"
            placeholder="e.g. Lahore"
            {...register("city")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="addr-address">
          Address <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="addr-address"
          placeholder="Full delivery address..."
          rows={3}
          aria-invalid={!!errors.address}
          {...register("address")}
        />
        {errors.address && (
          <p className="text-xs text-destructive">{errors.address.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="addr-isDefault"
          className="h-4 w-4 rounded border-input accent-primary"
          {...register("isDefault")}
        />
        <Label htmlFor="addr-isDefault" className="cursor-pointer">
          Set as default delivery address
        </Label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Add address"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setOpen(false); reset({ customerId, isDefault: false }); }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
