"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { allocatePayment, removeAllocation, deletePayment } from "@/server/payments/actions";
import type { getPayment, getOutstandingInvoicesForCustomer } from "@/server/payments/actions";

type Payment = Awaited<ReturnType<typeof getPayment>>;
type OutstandingInvoices = Awaited<ReturnType<typeof getOutstandingInvoicesForCustomer>>;

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  online: "Online",
};

interface Props {
  payment: Payment;
  canWrite: boolean;
  outstandingInvoices: OutstandingInvoices;
}

export function PaymentDetailClient({ payment, canWrite, outstandingInvoices }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Allocate modal
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocateInvoiceId, setAllocateInvoiceId] = useState("");
  const [allocateAmount, setAllocateAmount] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleAction(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    setAllocateError(null);
    setAllocating(true);
    try {
      await allocatePayment(
        payment.id,
        allocateInvoiceId,
        parseFloat(allocateAmount)
      );
      setAllocateOpen(false);
      setAllocateInvoiceId("");
      setAllocateAmount("");
      router.refresh();
    } catch (err) {
      setAllocateError(
        err instanceof Error ? err.message : "Failed to allocate"
      );
    } finally {
      setAllocating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deletePayment(payment.id);
      setDeleteOpen(false);
      router.push("/payments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete payment");
      setDeleting(false);
    }
  }

  const hasUnallocated = payment.unallocatedMinor > 0;
  const hasAllocatableInvoices = outstandingInvoices.some(
    (inv) => inv.outstandingMinor > 0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight font-mono">
              {payment.paymentNumber}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">{payment.customerName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {payment.paymentDate} · {METHOD_LABELS[payment.method] ?? payment.method}
            {payment.reference && ` · Ref: ${payment.reference}`}
          </p>
        </div>

        {canWrite && (
          <div className="flex items-center gap-2 flex-wrap">
            {hasUnallocated && hasAllocatableInvoices && (
              <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
                <DialogTrigger
                  render={
                    <Button disabled={isPending}>Allocate to Invoice</Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Allocate to Invoice</DialogTitle>
                    <DialogDescription>
                      Apply part of this payment to an outstanding invoice.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAllocate} className="space-y-4">
                    {allocateError && (
                      <p className="text-sm text-destructive">{allocateError}</p>
                    )}
                    <div className="space-y-2">
                      <Label className="text-sm">Invoice</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={allocateInvoiceId}
                        onChange={(e) => {
                          setAllocateInvoiceId(e.target.value);
                          const inv = outstandingInvoices.find(
                            (i) => i.id === e.target.value
                          );
                          if (inv) {
                            const maxAmount = Math.min(
                              payment.unallocatedMinor,
                              inv.outstandingMinor
                            );
                            setAllocateAmount(String(maxAmount / 100));
                          }
                        }}
                        required
                      >
                        <option value="">Select an invoice…</option>
                        {outstandingInvoices
                          .filter((inv) => inv.outstandingMinor > 0)
                          .map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.invoiceNumber} — {formatRupees(inv.outstandingMinor)} outstanding
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">
                        Amount (Rs){" "}
                        <span className="text-muted-foreground font-normal">
                          (available: {formatRupees(payment.unallocatedMinor)})
                        </span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={allocateAmount}
                        onChange={(e) => setAllocateAmount(e.target.value)}
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAllocateOpen(false)}
                        disabled={allocating}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={allocating || !allocateInvoiceId}
                      >
                        {allocating ? "Allocating..." : "Allocate"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger
                render={
                  <Button variant="destructive" size="sm" disabled={isPending}>
                    Delete
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete payment?</DialogTitle>
                  <DialogDescription>
                    This will delete the payment and remove all its allocations. Invoice statuses will be updated.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Summary card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
          <p className="text-2xl font-bold">{formatRupees(payment.amountMinor)}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Allocated</p>
          <p className="text-2xl font-bold text-emerald-700">
            {formatRupees(payment.allocatedMinor)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-1">Unallocated</p>
          <p
            className={cn(
              "text-2xl font-bold",
              payment.unallocatedMinor > 0 ? "text-amber-700" : "text-muted-foreground"
            )}
          >
            {formatRupees(payment.unallocatedMinor)}
          </p>
        </div>
      </div>

      {/* Allocations */}
      <div className="rounded-2xl border overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Invoice Allocations</p>
        </div>
        {payment.allocations.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No allocations yet. Allocate this payment to an invoice.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {payment.allocations.map((alloc) => (
              <div
                key={alloc.id}
                className="px-5 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium font-mono">
                    {alloc.invoiceNumber}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        alloc.invoiceStatus === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : alloc.invoiceStatus === "partial"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                      )}
                    >
                      {alloc.invoiceStatus}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Total: {formatRupees(alloc.invoiceTotal)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-emerald-700">
                    {formatRupees(alloc.amountMinor)}
                  </span>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive h-7 px-2"
                      onClick={() =>
                        handleAction(() => removeAllocation(alloc.id))
                      }
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {payment.notes && (
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Notes
          </p>
          <p className="text-sm">{payment.notes}</p>
        </div>
      )}
    </div>
  );
}
