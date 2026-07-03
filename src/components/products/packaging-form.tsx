"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPackagingOption } from "@/server/products/actions";
import { createPackagingOptionSchema } from "@/lib/validations/products";

type FormValues = z.infer<typeof createPackagingOptionSchema>;

interface PackagingFormProps {
  productId: string;
  baseUnit: string;
}

export function PackagingForm({ productId, baseUnit }: PackagingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createPackagingOptionSchema),
    defaultValues: {
      productId,
      name: "",
      factor: undefined,
    },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await createPackagingOption(values);
      if ("error" in result && result.error) {
        console.error(result.error);
        return;
      }
      reset({ productId, name: "", factor: undefined });
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-3 pt-2 border-t">
      <p className="text-sm font-medium text-muted-foreground">
        Add packaging option
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pkg-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="pkg-name"
            placeholder={`e.g. 50${baseUnit} bag`}
            {...register("name")}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkg-factor">
            {baseUnit} per package <span className="text-destructive">*</span>
          </Label>
          <Input
            id="pkg-factor"
            type="number"
            step="0.0001"
            min="0.0001"
            placeholder={`e.g. 50 for a 50${baseUnit} bag`}
            {...register("factor", { valueAsNumber: true })}
            aria-invalid={!!errors.factor}
          />
          {errors.factor && (
            <p className="text-xs text-destructive">{errors.factor.message}</p>
          )}
        </div>
      </div>
      <input type="hidden" {...register("productId")} />
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Adding..." : "Add packaging"}
      </Button>
    </form>
  );
}
