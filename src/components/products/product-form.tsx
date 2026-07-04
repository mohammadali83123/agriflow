"use client";

import { useTransition } from "react";
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
import { createProduct, updateProduct } from "@/server/products/actions";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  baseUnit: z.string().min(1, "Base unit is required"),
  category: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  minPriceMinor: z.number().int().nonnegative().optional(),
  basePriceMinor: z.number().int().nonnegative().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ProductFormProps = {
  product?: {
    id: string;
    name: string;
    baseUnit: string;
    category?: string | null;
    sku?: string | null;
    description?: string | null;
    status: "active" | "inactive";
    basePriceMinor?: number | null;
    minPriceMinor?: number | null;
  };
};

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name ?? "",
      baseUnit: product?.baseUnit ?? "",
      category: product?.category ?? "",
      sku: product?.sku ?? "",
      description: product?.description ?? "",
      status: product?.status ?? "active",
      basePriceMinor: undefined,
      minPriceMinor: undefined,
    },
  });

  const statusValue = watch("status");

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      if (isEdit) {
        const result = await updateProduct(product.id, values);
        if ("error" in result && result.error) return;
        router.push(`/products/${product.id}`);
      } else {
        const result = await createProduct(values);
        if ("error" in result && result.error) return;
        router.push("/products");
      }
    });
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* Core fields */}
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Product details
          </p>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Basmati Rice, Super Kernel"
                  {...register("name")}
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUnit" className="text-sm font-medium">
                  Base unit <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="baseUnit"
                  placeholder="e.g. kg, maund, bag, litre"
                  {...register("baseUnit")}
                  aria-invalid={!!errors.baseUnit}
                />
                {errors.baseUnit && (
                  <p className="text-xs text-destructive">{errors.baseUnit.message}</p>
                )}
              </div>

              {isEdit && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select
                    value={statusValue}
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
              )}

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g. Grain, Paddy, Bran"
                  {...register("category")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku" className="text-sm font-medium">SKU</Label>
                <Input
                  id="sku"
                  placeholder="e.g. BAS-001"
                  {...register("sku")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Optional product description"
                rows={2}
                {...register("description")}
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Pricing
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="basePriceRupees" className="text-sm font-medium">
                Base price (Rs / {watch("baseUnit") || "unit"})
              </Label>
              <Input
                id="basePriceRupees"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 180.00"
                defaultValue={
                  product?.basePriceMinor != null
                    ? product.basePriceMinor / 100
                    : undefined
                }
                onChange={(e) => {
                  const rupees = parseFloat(e.target.value);
                  setValue(
                    "basePriceMinor",
                    !isNaN(rupees) ? Math.round(rupees * 100) : undefined
                  );
                }}
              />
              {errors.basePriceMinor && (
                <p className="text-xs text-destructive">
                  {errors.basePriceMinor.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minPriceRupees" className="text-sm font-medium">
                Minimum price (Rs / {watch("baseUnit") || "unit"})
              </Label>
              <Input
                id="minPriceRupees"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 160.00"
                defaultValue={
                  product?.minPriceMinor != null
                    ? product.minPriceMinor / 100
                    : undefined
                }
                onChange={(e) => {
                  const rupees = parseFloat(e.target.value);
                  setValue(
                    "minPriceMinor",
                    !isNaN(rupees) ? Math.round(rupees * 100) : undefined
                  );
                }}
              />
              {errors.minPriceMinor && (
                <p className="text-xs text-destructive">
                  {errors.minPriceMinor.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="px-6 py-4 bg-muted/20 flex items-center gap-3">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending
              ? "Saving..."
              : isEdit
              ? "Update product"
              : "Create product"}
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
