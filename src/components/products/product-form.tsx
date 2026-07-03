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

// Local schema for the form — status is required (always has a value in the form)
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
        if ("error" in result && result.error) {
          console.error(result.error);
          return;
        }
        router.push(`/products/${product.id}`);
      } else {
        const result = await createProduct(values);
        if ("error" in result && result.error) {
          console.error(result.error);
          return;
        }
        router.push("/products");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g. Basmati Rice"
          {...register("name")}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Base unit */}
      <div className="space-y-1.5">
        <Label htmlFor="baseUnit">
          Base unit <span className="text-destructive">*</span>
        </Label>
        <Input
          id="baseUnit"
          placeholder="e.g. kg, maund, litre, piece"
          {...register("baseUnit")}
          aria-invalid={!!errors.baseUnit}
        />
        {errors.baseUnit && (
          <p className="text-xs text-destructive">{errors.baseUnit.message}</p>
        )}
      </div>

      {/* Category + SKU */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            placeholder="e.g. Grain"
            {...register("category")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU</Label>
          <Input
            id="sku"
            placeholder="e.g. BAS-001"
            {...register("sku")}
          />
        </div>
      </div>

      {/* Base price + Min price */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="basePriceRupees">Base price (Rs / base unit)</Label>
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
              if (!isNaN(rupees)) {
                setValue("basePriceMinor", Math.round(rupees * 100));
              } else {
                setValue("basePriceMinor", undefined);
              }
            }}
          />
          {errors.basePriceMinor && (
            <p className="text-xs text-destructive">
              {errors.basePriceMinor.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minPriceRupees">Min price (Rs / base unit)</Label>
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
              if (!isNaN(rupees)) {
                setValue("minPriceMinor", Math.round(rupees * 100));
              } else {
                setValue("minPriceMinor", undefined);
              }
            }}
          />
          {errors.minPriceMinor && (
            <p className="text-xs text-destructive">
              {errors.minPriceMinor.message}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional product description"
          {...register("description")}
        />
      </div>

      {/* Status — only in edit mode */}
      {isEdit && (
        <div className="space-y-1.5">
          <Label>Status</Label>
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

      <Button
        type="submit"
        className="w-full"
        disabled={isPending}
      >
        {isPending
          ? "Saving..."
          : isEdit
          ? "Update product"
          : "Create product"}
      </Button>
    </form>
  );
}
