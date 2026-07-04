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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBatch } from "@/server/production/actions";
import type { Warehouse } from "@/server/inventory/actions";

const formSchema = z.object({
  batchNumber: z.string().min(1, "Batch number is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  productionDate: z.string().min(1, "Date is required"),
  addedCostRupees: z.number().nonnegative(),
  allocationMethod: z.enum(["value", "weight", "manual"]),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ALLOCATION_DESCRIPTIONS: Record<string, string> = {
  value: "Allocate cost by relative market value of each output",
  weight: "Allocate cost by weight (quantity) of each output",
  manual: "Enter cost per output manually",
};

interface CreateBatchFormProps {
  warehouses: Warehouse[];
  suggestedBatchNumber: string;
}

export function CreateBatchForm({
  warehouses,
  suggestedBatchNumber,
}: CreateBatchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const defaultWarehouse = warehouses.find((w) => w.isDefault) ?? warehouses[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batchNumber: suggestedBatchNumber,
      warehouseId: defaultWarehouse?.id ?? "",
      productionDate: today,
      addedCostRupees: 0,
      allocationMethod: "value",
      notes: "",
    },
  });

  const selectedMethod = watch("allocationMethod");

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createBatch(values);
      if (result.error) {
        setServerError(
          typeof result.error === "string"
            ? result.error
            : "Please check the form and try again."
        );
        return;
      }
      if (result.data) {
        router.push(`/production/${result.data.id}`);
      }
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Batch details
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="batchNumber" className="text-sm font-medium">
                Batch number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="batchNumber"
                placeholder="e.g. BATCH-001"
                {...register("batchNumber")}
                aria-invalid={!!errors.batchNumber}
              />
              {errors.batchNumber && (
                <p className="text-xs text-destructive">
                  {errors.batchNumber.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="productionDate" className="text-sm font-medium">
                Production date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="productionDate"
                type="date"
                {...register("productionDate")}
                aria-invalid={!!errors.productionDate}
              />
              {errors.productionDate && (
                <p className="text-xs text-destructive">
                  {errors.productionDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select
                items={Object.fromEntries(
                  warehouses.map((w) => [w.id, w.isDefault ? `${w.name} (default)` : w.name])
                )}
                defaultValue={defaultWarehouse?.id}
                onValueChange={(val) => { if (val) setValue("warehouseId", val); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                      {w.isDefault && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (default)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.warehouseId && (
                <p className="text-xs text-destructive">
                  {errors.warehouseId.message}
                </p>
              )}
              {warehouses.length === 0 && (
                <p className="text-xs text-destructive">
                  No warehouses found. Create one in{" "}
                  <a href="/inventory/warehouses" className="underline">
                    Warehouses
                  </a>
                  .
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="addedCostRupees" className="text-sm font-medium">
                Added cost (Rs)
              </Label>
              <Input
                id="addedCostRupees"
                type="number"
                step="0.01"
                min="0"
                placeholder="Labor, fuel, packaging"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setValue("addedCostRupees", isNaN(val) ? 0 : val);
                }}
                defaultValue={0}
              />
              <p className="text-xs text-muted-foreground">
                Labor, fuel, and packaging costs added to the cost pool
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Cost allocation
          </p>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Allocation method</Label>
            <Select
              items={{ value: "By value", weight: "By weight", manual: "Manual" }}
              defaultValue="value"
              onValueChange={(val) =>
                setValue("allocationMethod", val as "value" | "weight" | "manual")
              }
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="value">By value</SelectItem>
                <SelectItem value="weight">By weight</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ALLOCATION_DESCRIPTIONS[selectedMethod]}
            </p>
          </div>
        </div>

        <div className="px-6 py-6 border-b">
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any remarks about this batch"
              rows={2}
              {...register("notes")}
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-muted/20 flex items-center gap-3">
          {serverError && (
            <p className="text-sm text-destructive flex-1">{serverError}</p>
          )}
          <Button type="submit" size="lg" disabled={isPending || warehouses.length === 0}>
            {isPending ? "Creating..." : "Create batch"}
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
