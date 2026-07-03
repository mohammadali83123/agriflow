"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MapPin, Star } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDeliveryAddress, removeDeliveryAddress } from "@/server/customers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { customerDeliveryAddress } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type DeliveryAddress = typeof customerDeliveryAddress.$inferSelect;

const addressFormSchema = z.object({
  customerId: z.string().min(1),
  label: z.string().min(1, "Label is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  isDefault: z.boolean(),
});

type AddressFormValues = z.infer<typeof addressFormSchema>;

interface DeliveryAddressesSectionProps {
  customerId: string;
  addresses: DeliveryAddress[];
  canWrite: boolean;
}

export function DeliveryAddressesSection({
  customerId,
  addresses,
  canWrite,
}: DeliveryAddressesSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: { customerId, isDefault: false },
  });

  const isDefault = watch("isDefault");

  async function onSubmit(data: AddressFormValues) {
    setServerError(null);
    try {
      await addDeliveryAddress(data);
      reset({ customerId, isDefault: false });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeDeliveryAddress(id);
      router.refresh();
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Delivery addresses</h2>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <Plus className="size-3.5" />
                  Add address
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add delivery address</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <input type="hidden" {...register("customerId")} />
                {serverError && (
                  <p className="text-sm text-destructive">{serverError}</p>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="addr-label">
                    Label <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addr-label"
                    placeholder="e.g. Main warehouse, Site B"
                    aria-invalid={!!errors.label}
                    {...register("label")}
                  />
                  {errors.label && (
                    <p className="text-xs text-destructive">{errors.label.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addr-city">City</Label>
                  <Input
                    id="addr-city"
                    placeholder="e.g. Lahore"
                    {...register("city")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="addr-address">
                    Address <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="addr-address"
                    placeholder="Street, area, landmarks…"
                    rows={3}
                    aria-invalid={!!errors.address}
                    {...register("address")}
                  />
                  {errors.address && (
                    <p className="text-xs text-destructive">{errors.address.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="addr-default"
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setValue("isDefault", e.target.checked)}
                    className="size-4 rounded border-input"
                  />
                  <Label htmlFor="addr-default">Set as default delivery address</Label>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving…" : "Add address"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-xl border py-8 text-center text-sm text-muted-foreground">
          No delivery addresses yet.
        </div>
      ) : (
        <div className="rounded-xl border divide-y">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="flex items-start justify-between gap-3 px-4 py-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {addr.label}
                  {addr.isDefault && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-normal">
                      <Star className="size-3 fill-current" /> Default
                    </span>
                  )}
                </div>
                {addr.city && (
                  <p className="text-xs text-muted-foreground pl-5">{addr.city}</p>
                )}
                <p className="text-xs text-muted-foreground pl-5">{addr.address}</p>
              </div>
              {canWrite && (
                <button
                  onClick={() => handleRemove(addr.id)}
                  className={cn(
                    "text-muted-foreground hover:text-destructive transition-colors p-1 rounded",
                    addr.isDefault &&
                      "opacity-50 cursor-not-allowed pointer-events-none"
                  )}
                  aria-label="Remove address"
                  disabled={addr.isDefault}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
