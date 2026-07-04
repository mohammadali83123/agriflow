"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createOrder } from "@/server/orders/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  customers: { id: string; name: string; phone: string }[];
}

export function NewOrderForm({ customers }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { customerId: "", notes: "" },
  });

  const customerId = watch("customerId");

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      const order = await createOrder(data);
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {serverError && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            Order details
          </p>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="customerId" className="text-sm font-medium">
                Customer <span className="text-destructive">*</span>
              </Label>
              <Select
                value={customerId}
                onValueChange={(val) => setValue("customerId", val ?? "", { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && (
                <p className="text-xs text-destructive">{errors.customerId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions..."
                rows={3}
                {...register("notes")}
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-muted/20 flex items-center gap-3">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create order"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
