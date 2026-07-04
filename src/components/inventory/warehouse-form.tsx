"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createWarehouse, updateWarehouse } from "@/server/inventory/actions";
import type { Warehouse } from "@/server/inventory/actions";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  isDefault: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface WarehouseFormProps {
  warehouse?: Warehouse;
  onSuccess?: () => void;
}

export function WarehouseForm({ warehouse, onSuccess }: WarehouseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!warehouse;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: warehouse?.name ?? "",
      address: warehouse?.address ?? "",
      isDefault: warehouse?.isDefault ?? false,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      let result;
      if (isEdit) {
        result = await updateWarehouse(warehouse.id, values);
      } else {
        result = await createWarehouse(values);
      }

      if (result.error) {
        if (typeof result.error === "string") {
          setServerError(result.error);
        } else {
          setServerError("Please check the form and try again.");
        }
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/inventory/warehouses");
      }
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Warehouse details
          </p>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Main Godown, Mill Warehouse"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">
                Address (optional)
              </Label>
              <Textarea
                id="address"
                placeholder="Physical address or location description"
                rows={2}
                {...register("address")}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isDefault"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...register("isDefault")}
              />
              <Label htmlFor="isDefault" className="text-sm font-medium cursor-pointer">
                Set as default warehouse
              </Label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-muted/20 flex items-center gap-3">
          {serverError && (
            <p className="text-sm text-destructive flex-1">{serverError}</p>
          )}
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending
              ? "Saving..."
              : isEdit
              ? "Update warehouse"
              : "Create warehouse"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
