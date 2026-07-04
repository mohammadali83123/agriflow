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
import { recordAdjustment } from "@/server/inventory/actions";

const ADJUSTMENT_REASONS = [
  { value: "damage", label: "Damage" },
  { value: "theft", label: "Theft" },
  { value: "correction", label: "Stock correction" },
  { value: "sample", label: "Sample / testing" },
  { value: "audit", label: "Audit reconciliation" },
  { value: "other", label: "Other" },
] as const;

const formSchema = z
  .object({
    productId: z.string().min(1, "Product is required"),
    variantId: z.string().optional(),
    warehouseId: z.string().min(1, "Warehouse is required"),
    quantity: z.number().refine((v) => v !== 0, "Quantity cannot be zero"),
    reason: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.quantity < 0 && !data.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Reason is required when reducing stock",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

type Product = {
  id: string;
  name: string;
  baseUnit: string;
  status: string;
};

type ProductVariant = {
  id: string;
  productId: string;
  name: string;
};

type Warehouse = {
  id: string;
  name: string;
  isDefault: boolean;
};

interface AdjustFormProps {
  products: Product[];
  variants: ProductVariant[];
  warehouses: Warehouse[];
}

export function AdjustForm({ products, variants, warehouses }: AdjustFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

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
      productId: "",
      variantId: undefined,
      warehouseId: defaultWarehouse?.id ?? "",
      quantity: undefined,
      reason: undefined,
      notes: "",
    },
  });

  const selectedProductId = watch("productId");
  const quantity = watch("quantity");
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const productVariants = variants.filter(
    (v) => v.productId === selectedProductId
  );
  const isNegative = typeof quantity === "number" && quantity < 0;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await recordAdjustment(values);
      if (result.error) {
        if (typeof result.error === "string") {
          setServerError(result.error);
        } else {
          setServerError("Please check the form and try again.");
        }
        return;
      }
      router.push("/inventory");
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* Product & warehouse */}
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Product & location
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="productId" className="text-sm font-medium">
                Product <span className="text-destructive">*</span>
              </Label>
              <Select
                items={Object.fromEntries(
                  products.filter((p) => p.status === "active").map((p) => [p.id, p.name])
                )}
                onValueChange={(val) => {
                  setValue("productId", val as string);
                  setValue("variantId", undefined);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => p.status === "active")
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-xs text-destructive">
                  {errors.productId.message}
                </p>
              )}
            </div>

            {productVariants.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Variant</Label>
                <Select
                  items={Object.fromEntries(productVariants.map((v) => [v.id, v.name]))}
                  onValueChange={(val) => setValue("variantId", val as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All variants" />
                  </SelectTrigger>
                  <SelectContent>
                    {productVariants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="warehouseId" className="text-sm font-medium">
                Warehouse <span className="text-destructive">*</span>
              </Label>
              <Select
                items={Object.fromEntries(
                  warehouses.map((w) => [w.id, w.isDefault ? `${w.name} (default)` : w.name])
                )}
                defaultValue={defaultWarehouse?.id ?? undefined}
                onValueChange={(val) => setValue("warehouseId", val as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.warehouseId && (
                <p className="text-xs text-destructive">
                  {errors.warehouseId.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Adjustment */}
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Adjustment
          </p>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm font-medium">
                Quantity change{" "}
                {selectedProduct && (
                  <span className="text-muted-foreground font-normal">
                    ({selectedProduct.baseUnit})
                  </span>
                )}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Enter a positive number to add stock, negative to remove.
                Example: +50 to add 50 units, -10 to remove 10.
              </p>
              <Input
                id="quantity"
                type="number"
                step="0.001"
                placeholder="e.g. -5.000 or +20.000"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setValue(
                    "quantity",
                    isNaN(val) ? (undefined as unknown as number) : val
                  );
                }}
                aria-invalid={!!errors.quantity}
                className={isNegative ? "border-orange-400 focus-visible:ring-orange-400" : ""}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">
                  {errors.quantity.message}
                </p>
              )}
            </div>

            {/* Reason — always shown, required when negative */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Reason{" "}
                {isNegative && (
                  <span className="text-destructive">*</span>
                )}
                {!isNegative && (
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                )}
              </Label>
              <Select
                items={{
                  none: "No reason",
                  ...Object.fromEntries(ADJUSTMENT_REASONS.map((r) => [r.value, r.label])),
                }}
                onValueChange={(val) =>
                  setValue("reason", (val as string) === "none" ? undefined : (val as string))
                }
              >
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {!isNegative && (
                    <SelectItem value="none">No reason</SelectItem>
                  )}
                  {ADJUSTMENT_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.reason && (
                <p className="text-xs text-destructive">
                  {errors.reason.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes (optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Additional details about this adjustment"
                rows={2}
                {...register("notes")}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-muted/20 flex items-center gap-3">
          {serverError && (
            <p className="text-sm text-destructive flex-1">{serverError}</p>
          )}
          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            variant={isNegative ? "destructive" : "default"}
          >
            {isPending ? "Saving..." : "Save adjustment"}
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
