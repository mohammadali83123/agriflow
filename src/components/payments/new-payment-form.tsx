"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createPayment } from "@/server/payments/actions";
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

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amountRupees: z.number({ invalid_type_error: "Amount is required" }).positive("Amount must be positive"),
  method: z.enum(["cash", "bank_transfer", "cheque", "online"]),
  paymentDate: z.string().min(1, "Payment date is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  customers: { id: string; name: string; phone: string }[];
}

export function NewPaymentForm({ customers }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      amountRupees: undefined,
      method: "cash",
      paymentDate: today,
      reference: "",
      notes: "",
    },
  });

  const customerId = watch("customerId");
  const method = watch("method");

  async function onSubmit(data: FormValues) {
    setServerError(null);
    try {
      const payment = await createPayment({
        ...data,
        reference: data.reference || undefined,
        notes: data.notes || undefined,
      });
      router.push(`/payments/${payment.id}`);
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
            Payment details
          </p>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="customerId" className="text-sm font-medium">
                Customer <span className="text-destructive">*</span>
              </Label>
              <Select
                value={customerId}
                onValueChange={(val) =>
                  setValue("customerId", val ?? "", { shouldValidate: true })
                }
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
                <p className="text-xs text-destructive">
                  {errors.customerId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amountRupees" className="text-sm font-medium">
                  Amount (Rs) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amountRupees"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...register("amountRupees", { valueAsNumber: true })}
                />
                {errors.amountRupees && (
                  <p className="text-xs text-destructive">
                    {errors.amountRupees.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDate" className="text-sm font-medium">
                  Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input type="date" id="paymentDate" {...register("paymentDate")} />
                {errors.paymentDate && (
                  <p className="text-xs text-destructive">
                    {errors.paymentDate.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Method</Label>
                <Select
                  value={method}
                  onValueChange={(val) =>
                    setValue("method", val as FormValues["method"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference" className="text-sm font-medium">
                  Reference
                </Label>
                <Input
                  id="reference"
                  placeholder="Cheque #, transaction ID, etc."
                  {...register("reference")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Any notes for this payment..."
                rows={3}
                {...register("notes")}
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-muted/20 flex items-center gap-3">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Recording..." : "Record payment"}
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
