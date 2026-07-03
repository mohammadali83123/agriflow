"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setDailyPrice } from "@/server/products/actions";

interface PriceFormProps {
  productId: string;
  variants: Array<{ id: string; name: string }>;
}

type FormState = {
  effectiveDate: string;
  priceRupees: string;
  variantId: string;
};

export function PriceForm({ productId, variants }: PriceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<FormState>({
      defaultValues: {
        effectiveDate: today,
        priceRupees: "",
        variantId: "",
      },
    });

  const variantValue = watch("variantId");

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const priceRupees = parseFloat(values.priceRupees);
      if (isNaN(priceRupees) || priceRupees < 0) return;

      const priceMinor = Math.round(priceRupees * 100);

      const result = await setDailyPrice({
        productId,
        variantId: values.variantId || undefined,
        priceMinor,
        effectiveDate: values.effectiveDate,
      });

      if ("error" in result && result.error) {
        console.error(result.error);
        return;
      }

      reset({ effectiveDate: today, priceRupees: "", variantId: "" });
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="price-date">
            Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="price-date"
            type="date"
            {...register("effectiveDate", { required: true })}
          />
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <Label htmlFor="price-rupees">
            Price (Rs / base unit) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="price-rupees"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 185.50"
            {...register("priceRupees", { required: true })}
          />
        </div>

        {/* Variant */}
        {variants.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="price-variant">Variant (optional)</Label>
            <Select
              value={variantValue}
              onValueChange={(val: string | null) => setValue("variantId", val ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All variants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All variants</SelectItem>
                {variants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Set price"}
      </Button>
    </form>
  );
}
