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
import { recordOpeningStock } from "@/server/inventory/actions";

const formSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional(),
  warehouseId: z.string().min(1, "Warehouse is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unitCostRupees: z.number().nonnegative("Unit cost must be 0 or greater"),
  reason: z.string().optional(),
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

interface OpeningFormProps {
  products: Product[];
  variants: ProductVariant[];
  warehouses: Warehouse[];
}

export function OpeningForm({ products, variants, warehouses }: OpeningFormProps) {
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
      unitCostRupees: undefined,
      reason: "",
    },
  });

  const selectedProductId = watch("productId");
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const productVariants = variants.filter(
    (v) => v.productId === selectedProductId
  );

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await recordOpeningStock(values);
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
            Product details
          </p>
          <div className="space-y-5">
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
                      <SelectValue placeholder="All variants / select one" />
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-medium">
                  Quantity{" "}
                  {selectedProduct && (
                    <span className="text-muted-foreground font-normal">
                      ({selectedProduct.baseUnit})
                    </span>
                  )}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="e.g. 500.000"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setValue(
                      "quantity",
                      isNaN(val) ? (undefined as unknown as number) : val
                    );
                  }}
                  aria-invalid={!!errors.quantity}
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitCostRupees" className="text-sm font-medium">
                  Unit cost{" "}
                  {selectedProduct && (
                    <span className="text-muted-foreground font-normal">
                      (Rs / {selectedProduct.baseUnit})
                    </span>
                  )}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="unitCostRupees"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 3000.00"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setValue(
                      "unitCostRupees",
                      isNaN(val) ? (undefined as unknown as number) : val
                    );
                  }}
                  aria-invalid={!!errors.unitCostRupees}
                />
                {errors.unitCostRupees && (
                  <p className="text-xs text-destructive">
                    {errors.unitCostRupees.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Notes (optional)
              </Label>
              <Textarea
                id="reason"
                placeholder="Any notes about this opening stock entry"
                rows={2}
                {...register("reason")}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-muted/20 flex items-center gap-3">
          {serverError && (
            <p className="text-sm text-destructive flex-1">{serverError}</p>
          )}
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Saving..." : "Save opening stock"}
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
