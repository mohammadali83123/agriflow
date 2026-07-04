"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  addInvoiceLine,
  removeInvoiceLine,
  updateInvoiceStatus,
  setInvoiceTax,
  deleteInvoice,
} from "@/server/invoices/actions";
import { allocatePayment, removeAllocation } from "@/server/payments/actions";
import type { getInvoice } from "@/server/invoices/actions";
import type { getOutstandingInvoicesForCustomer } from "@/server/payments/actions";

type Invoice = Awaited<ReturnType<typeof getInvoice>>;
type OutstandingInvoices = Awaited<ReturnType<typeof getOutstandingInvoicesForCustomer>>;

type InvoiceStatus = Invoice["status"];

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cls: Record<InvoiceStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    partial: "bg-amber-100 text-amber-700",
    paid: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-500 line-through",
  };
  const labels: Record<InvoiceStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    partial: "Partial",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", cls[status])}>
      {labels[status]}
    </span>
  );
}

interface Props {
  invoice: Invoice;
  canWrite: boolean;
  // Unallocated payments for this customer (for "Record payment" modal)
  customerPayments: {
    id: string;
    paymentNumber: string;
    amountMinor: number;
    unallocatedMinor: number;
    paymentDate: string;
    method: string;
  }[];
}

export function InvoiceDetailClient({ invoice, canWrite, customerPayments }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Add line form
  const [showAddLine, setShowAddLine] = useState(false);
  const [lineDesc, setLineDesc] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [linePrice, setLinePrice] = useState("");
  const [lineAdding, setLineAdding] = useState(false);
  const [lineError, setLineError] = useState<string | null>(null);

  // Tax
  const [showTax, setShowTax] = useState(invoice.taxRate !== null);
  const [taxRateInput, setTaxRateInput] = useState(
    invoice.taxRate ? String(parseFloat(invoice.taxRate) * 100) : "17"
  );
  const [taxSaving, setTaxSaving] = useState(false);

  // Allocate payment modal
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [allocatePaymentId, setAllocatePaymentId] = useState("");
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

  async function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    setLineError(null);
    setLineAdding(true);
    try {
      await addInvoiceLine(invoice.id, {
        description: lineDesc,
        quantity: parseFloat(lineQty),
        unitPriceRupees: parseFloat(linePrice),
      });
      setLineDesc("");
      setLineQty("1");
      setLinePrice("");
      setShowAddLine(false);
      router.refresh();
    } catch (err) {
      setLineError(err instanceof Error ? err.message : "Failed to add line");
    } finally {
      setLineAdding(false);
    }
  }

  async function handleSaveTax() {
    setTaxSaving(true);
    try {
      if (showTax) {
        await setInvoiceTax(invoice.id, parseFloat(taxRateInput));
      } else {
        await setInvoiceTax(invoice.id, null);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tax");
    } finally {
      setTaxSaving(false);
    }
  }

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault();
    setAllocateError(null);
    setAllocating(true);
    try {
      await allocatePayment(
        allocatePaymentId,
        invoice.id,
        parseFloat(allocateAmount)
      );
      setAllocateOpen(false);
      setAllocatePaymentId("");
      setAllocateAmount("");
      router.refresh();
    } catch (err) {
      setAllocateError(
        err instanceof Error ? err.message : "Failed to allocate payment"
      );
    } finally {
      setAllocating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteInvoice(invoice.id);
      setDeleteOpen(false);
      router.push("/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete invoice");
      setDeleting(false);
    }
  }

  const isDraft = invoice.status === "draft";
  const isCancelled = invoice.status === "cancelled";
  const unallocatedPayments = customerPayments.filter(
    (p) => p.unallocatedMinor > 0
  );

  const outstandingMinor = invoice.totalMinor - invoice.amountPaidMinor;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight font-mono">
              {invoice.invoiceNumber}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Issued: {invoice.issueDate}
            {invoice.dueDate && ` · Due: ${invoice.dueDate}`}
          </p>
        </div>

        {!isCancelled && (
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft && canWrite && (
              <Button
                onClick={() =>
                  handleAction(() => updateInvoiceStatus(invoice.id, "sent"))
                }
                disabled={isPending || invoice.lines.length === 0}
              >
                {isPending ? "Updating..." : "Mark Sent"}
              </Button>
            )}
            {!isDraft && canWrite && invoice.status !== "paid" && (
              <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline" disabled={isPending}>
                      Record Payment
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Allocate Payment</DialogTitle>
                    <DialogDescription>
                      Apply an existing payment to this invoice.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAllocate} className="space-y-4">
                    {allocateError && (
                      <p className="text-sm text-destructive">{allocateError}</p>
                    )}
                    <div className="space-y-2">
                      <Label className="text-sm">Payment</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={allocatePaymentId}
                        onChange={(e) => {
                          setAllocatePaymentId(e.target.value);
                          const p = unallocatedPayments.find(
                            (p) => p.id === e.target.value
                          );
                          if (p) {
                            const outstanding = outstandingMinor;
                            const maxAmount = Math.min(
                              p.unallocatedMinor,
                              outstanding
                            );
                            setAllocateAmount(String(maxAmount / 100));
                          }
                        }}
                        required
                      >
                        <option value="">Select a payment…</option>
                        {unallocatedPayments.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.paymentNumber} — {formatRupees(p.unallocatedMinor)} available ({p.paymentDate})
                          </option>
                        ))}
                      </select>
                      {unallocatedPayments.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No unallocated payments for this customer.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Amount (Rs)</Label>
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
                        disabled={allocating || !allocatePaymentId}
                      >
                        {allocating ? "Allocating..." : "Allocate"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            {canWrite && (
              <Button
                variant="outline"
                onClick={() =>
                  handleAction(() =>
                    updateInvoiceStatus(invoice.id, "cancelled")
                  )
                }
                disabled={isPending}
              >
                Cancel Invoice
              </Button>
            )}
            {isDraft && canWrite && (
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
                    <DialogTitle>Delete invoice?</DialogTitle>
                    <DialogDescription>
                      This will soft-delete the draft invoice. This cannot be undone easily.
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
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Invoice lines */}
      <div className="rounded-2xl border overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Invoice Lines</p>
          {isDraft && canWrite && !showAddLine && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddLine(true)}
            >
              + Add line
            </Button>
          )}
        </div>

        {invoice.lines.length === 0 && !showAddLine ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No lines yet. Add an item to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {["Description", "Qty", "Unit Price", "Total", isDraft ? "" : null]
                    .filter(Boolean)
                    .map((h, i) => (
                      <th
                        key={i}
                        className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-muted/20">
                    <td className="py-4 px-4 text-sm">{line.description}</td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {parseFloat(line.quantity).toFixed(3)}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {formatRupees(line.unitPriceMinor)}
                    </td>
                    <td className="py-4 px-4 text-sm font-medium">
                      {formatRupees(line.lineTotalMinor)}
                    </td>
                    {isDraft && canWrite && (
                      <td className="py-4 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleAction(() => removeInvoiceLine(line.id))
                          }
                          disabled={isPending}
                        >
                          Remove
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add line form */}
        {showAddLine && (
          <form
            onSubmit={handleAddLine}
            className="px-5 py-4 border-t bg-muted/20 space-y-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Add line
            </p>
            {lineError && (
              <p className="text-sm text-destructive">{lineError}</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-1">
                <Label className="text-xs">Description *</Label>
                <Input
                  placeholder="e.g. Rice (25kg bag)"
                  value={lineDesc}
                  onChange={(e) => setLineDesc(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity *</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="1.000"
                  value={lineQty}
                  onChange={(e) => setLineQty(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit Price (Rs) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={linePrice}
                  onChange={(e) => setLinePrice(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={lineAdding}>
                {lineAdding ? "Adding..." : "Add line"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddLine(false);
                  setLineError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Tax & totals */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Totals</p>
          {isDraft && canWrite && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTax}
                  onChange={(e) => setShowTax(e.target.checked)}
                  className="rounded"
                />
                Apply GST
              </label>
              {showTax && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-20 h-8 text-sm"
                    value={taxRateInput}
                    onChange={(e) => setTaxRateInput(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveTax}
                disabled={taxSaving}
              >
                {taxSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>
        <div className="px-5 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatRupees(invoice.subtotalMinor)}</span>
          </div>
          {(invoice.taxRate !== null || invoice.taxMinor > 0) && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Tax ({invoice.taxRate ? (parseFloat(invoice.taxRate) * 100).toFixed(2) : 0}%)
              </span>
              <span>{formatRupees(invoice.taxMinor)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t pt-2 mt-2">
            <span>Total</span>
            <span>{formatRupees(invoice.totalMinor)}</span>
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className="rounded-2xl border overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b">
          <p className="text-sm font-semibold">Payment History</p>
        </div>
        {invoice.allocations.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {invoice.allocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="px-5 py-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium font-mono">
                      {alloc.paymentNumber}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {alloc.paymentDate} ·{" "}
                      {alloc.method.replace("_", " ")}
                    </p>
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
            <div className="px-5 py-3 bg-muted/20 border-t flex items-center justify-between">
              <span className="text-sm font-medium">
                Total paid: {formatRupees(invoice.amountPaidMinor)}
              </span>
              {outstandingMinor > 0 ? (
                <span className="text-sm font-semibold text-red-600">
                  Outstanding: {formatRupees(outstandingMinor)}
                </span>
              ) : (
                <span className="text-sm font-semibold text-emerald-700">
                  Fully paid
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {invoice.notes && (
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Notes
          </p>
          <p className="text-sm">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
