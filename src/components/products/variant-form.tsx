"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createVariant } from "@/server/products/actions";
import { createVariantSchema } from "@/lib/validations/products";

type FormValues = z.infer<typeof createVariantSchema>;

interface VariantFormProps {
  productId: string;
}

export function VariantForm({ productId }: VariantFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createVariantSchema),
    defaultValues: {
      productId,
      name: "",
      grade: "",
      quality: "",
      brand: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await createVariant(values);
      if ("error" in result && result.error) {
        console.error(result.error);
        return;
      }
      reset({ productId, name: "", grade: "", quality: "", brand: "" });
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3 pt-2 border-t">
      <p className="text-sm font-medium text-muted-foreground">Add variant</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="variant-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="variant-name"
            placeholder="e.g. Grade A"
            {...register("name")}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="variant-grade">Grade</Label>
          <Input
            id="variant-grade"
            placeholder="e.g. Super"
            {...register("grade")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="variant-quality">Quality</Label>
          <Input
            id="variant-quality"
            placeholder="e.g. Broken 5%"
            {...register("quality")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="variant-brand">Brand</Label>
          <Input
            id="variant-brand"
            placeholder="e.g. Kernel"
            {...register("brand")}
          />
        </div>
      </div>
      <input type="hidden" {...register("productId")} />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Adding..." : "Add variant"}
      </Button>
    </form>
  );
}
