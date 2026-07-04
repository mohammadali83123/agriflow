"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/money";
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
import {
  confirmOrder,
  cancelOrder,
  markReady,
  createDispatch,
  addOrderLine,
  removeOrderLine,
  deleteOrder,
} from "@/server/orders/actions";
import type {
  getOrder,
  getProductsForSelect,
  getWarehousesForSelect,
} from "@/server/orders/actions";

type Order = Awaited<ReturnType<typeof getOrder>>;
type Products = Awaited<ReturnType<typeof getProductsForSelect>>;
type Warehouses = Awaited<ReturnType<typeof getWarehousesForSelect>>;
type OrderStatus = Order["status"];

interface Props {
  order: Order;
  products: Products;
  warehouses: Warehouses;
  canWrite: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  canOverridePrice: boolean;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const cls: Record<OrderStatus, string> = {
    draft: "bg-gray-100 text-gray-700",
    confirmed: "bg-blue-100 text-blue-700",
    reserved: "bg-blue-100 text-blue-700",
    ready: "bg-amber-100 text-amber-700",
    dispatched: "bg-green-100 text-green-700",
    delivered: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const labels: Record<OrderStatus, string> = {
    draft: "Draft",
    confirmed: "Confirmed",
    reserved: "Reserved",
    ready: "Ready",
    dispatched: "Dispatched",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", cls[status])}>
      {labels[status]}
    </span>
  );
}

export function OrderDetailClient({
  order,
  products,
  warehouses,
  canWrite,
  canConfirm,
  canCancel,
}: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddLine, setShowAddLine] = useState(false);
  const [showDispatchForm, setShowDispatchForm] = useState(false);

  // Add line form state
  const [lineProductId, setLineProductId] = useState("");
  const [lineWarehouseId, setLineWarehouseId] = useState("");
  const [lineQty, setLineQty] = useState("");
  const [lineAdding, setLineAdding] = useState(false);
  const [lineError, setLineError] = useState<string | null>(null);

  // Dispatch form state
  const [dispatchMethod, setDispatchMethod] = useState<
    "company_transport" | "customer_pickup"
  >("company_transport");
  const [dispatchVehicle, setDispatchVehicle] = useState("");
  const [dispatchDriver, setDispatchDriver] = useState("");
  const [dispatchDate, setDispatchDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [dispatchQtys, setDispatchQtys] = useState<Record<string, string>>({});
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Subtotal
  const subtotalMinor = order.lines.reduce((sum, l) => sum + l.lineTotalMinor, 0n);

  function handleAction(action: () => Promise<void>) {
    setError(null);
    setIsPending(true);
    action()
      .then(() => router.refresh())
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"))
      .finally(() => setIsPending(false));
  }

  async function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    setLineError(null);
    setLineAdding(true);
    try {
      await addOrderLine(order.id, {
        productId: lineProductId,
        warehouseId: lineWarehouseId,
        qtyOrdered: parseFloat(lineQty),
      });
      setLineProductId("");
      setLineWarehouseId("");
      setLineQty("");
      setShowAddLine(false);
      router.refresh();
    } catch (err) {
      setLineError(err instanceof Error ? err.message : "Failed to add line");
    } finally {
      setLineAdding(false);
    }
  }

  async function handleDispatch(e: React.FormEvent) {
    e.preventDefault();
    setDispatchError(null);
    setDispatchSubmitting(true);

    const lines = order.lines
      .filter((l) => dispatchQtys[l.id] && parseFloat(dispatchQtys[l.id]) > 0)
      .map((l) => ({ orderLineId: l.id, quantity: parseFloat(dispatchQtys[l.id]) }));

    if (lines.length === 0) {
      setDispatchError("Enter quantity for at least one line");
      setDispatchSubmitting(false);
      return;
    }

    try {
      await createDispatch(order.id, {
        method: dispatchMethod,
        vehicle: dispatchVehicle || undefined,
        driver: dispatchDriver || undefined,
        dispatchDate,
        notes: dispatchNotes || undefined,
        lines,
      });
      setShowDispatchForm(false);
      setDispatchQtys({});
      router.refresh();
    } catch (err) {
      setDispatchError(
        err instanceof Error ? err.message : "Failed to create dispatch"
      );
    } finally {
      setDispatchSubmitting(false);
    }
  }

  const isReadOnly = [
    "dispatched",
    "delivered",
    "completed",
    "cancelled",
  ].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight font-mono">
              {order.orderNumber}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">{order.customerName}</p>
        </div>

        {/* Action buttons */}
        {!isReadOnly && (
          <div className="flex items-center gap-2 flex-wrap">
            {order.status === "draft" && canConfirm && (
              <Button
                onClick={() => handleAction(() => confirmOrder(order.id))}
                disabled={isPending || order.lines.length === 0}
              >
                {isPending ? "Confirming..." : "Confirm & Reserve"}
              </Button>
            )}
            {order.status === "reserved" && canWrite && (
              <Button
                onClick={() => handleAction(() => markReady(order.id))}
                disabled={isPending}
              >
                {isPending ? "Updating..." : "Mark Ready"}
              </Button>
            )}
            {(order.status === "ready" || order.status === "reserved") &&
              canWrite && (
                <Button
                  onClick={() => setShowDispatchForm(true)}
                  disabled={isPending}
                >
                  Create Dispatch
                </Button>
              )}
            {canCancel && order.status !== "draft" && (
              <Button
                variant="outline"
                onClick={() => handleAction(() => cancelOrder(order.id))}
                disabled={isPending}
              >
                Cancel Order
              </Button>
            )}
            {order.status === "draft" && canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  handleAction(async () => {
                    await deleteOrder(order.id);
                    router.push("/orders");
                  })
                }
                disabled={isPending}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Order lines */}
      <div className="rounded-2xl border overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Order Lines</p>
          {order.status === "draft" && canWrite && !showAddLine && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddLine(true)}
            >
              + Add line
            </Button>
          )}
        </div>

        {order.lines.length === 0 && !showAddLine ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No lines yet. Add a product to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    "Product",
                    "Warehouse",
                    "Qty Ordered",
                    "Qty Dispatched",
                    "Unit Price",
                    "Total",
                    order.status === "draft" ? "" : null,
                  ]
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
                {order.lines.map((line) => (
                  <tr
                    key={line.id}
                    className={cn(line.belowMinOverride && "bg-amber-50")}
                  >
                    <td className="py-4 px-4 text-sm font-medium">
                      {line.productName}
                      {line.belowMinOverride && (
                        <span className="ml-2 text-xs text-amber-600 font-normal">
                          below min
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {line.warehouseName}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {parseFloat(line.qtyOrdered).toFixed(3)}{" "}
                      {line.productBaseUnit}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {parseFloat(line.qtyDispatched).toFixed(3)}{" "}
                      {line.productBaseUnit}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      {formatRupees(line.unitPriceMinor)}
                    </td>
                    <td className="py-4 px-4 text-sm font-medium">
                      {formatRupees(line.lineTotalMinor)}
                    </td>
                    {order.status === "draft" && canWrite && (
                      <td className="py-4 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleAction(() => removeOrderLine(line.id))
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
            {lineError && <p className="text-sm text-destructive">{lineError}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Product *</Label>
                <Select
                  value={lineProductId}
                  onValueChange={(v) => setLineProductId(v ?? "")}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product">
                      {products.find((p) => p.id === lineProductId)?.name ?? "Select product"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Warehouse *</Label>
                <Select
                  value={lineWarehouseId}
                  onValueChange={(v) => setLineWarehouseId(v ?? "")}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse">
                      {warehouses.find((w) => w.id === lineWarehouseId)?.name ?? "Select warehouse"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qty (base units) *</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.000"
                  value={lineQty}
                  onChange={(e) => setLineQty(e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Unit price is auto-resolved from the current day&apos;s pricing for the selected product.
            </p>
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

      {/* Summary */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatRupees(subtotalMinor)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="text-muted-foreground">(Invoice — Sprint 8)</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2 mt-2">
            <span>Total</span>
            <span>{formatRupees(subtotalMinor)}</span>
          </div>
        </div>
      </div>

      {/* Order notes */}
      {order.notes && (
        <div className="rounded-2xl border bg-card shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Notes
          </p>
          <p className="text-sm">{order.notes}</p>
        </div>
      )}

      {/* Dispatch history */}
      {order.dispatches.length > 0 && (
        <div className="rounded-2xl border overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b">
            <p className="text-sm font-semibold">Dispatch History</p>
          </div>
          <div className="divide-y">
            {order.dispatches.map((d) => (
              <div key={d.id} className="px-5 py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {d.dispatchDate} —{" "}
                    {d.method === "company_transport"
                      ? "Company Transport"
                      : "Customer Pickup"}
                  </div>
                </div>
                {(d.vehicle || d.driver) && (
                  <p className="text-sm text-muted-foreground">
                    {d.vehicle && `Vehicle: ${d.vehicle}`}
                    {d.vehicle && d.driver && " • "}
                    {d.driver && `Driver: ${d.driver}`}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  {d.lines.map((dl) => {
                    const ol = order.lines.find((l) => l.id === dl.orderLineId);
                    return (
                      <span key={dl.id} className="mr-3">
                        {ol?.productName}: {parseFloat(dl.quantity).toFixed(3)}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispatch form */}
      {showDispatchForm &&
        (order.status === "ready" || order.status === "reserved") && (
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b">
              <p className="text-sm font-semibold">Create Dispatch</p>
            </div>
            <form onSubmit={handleDispatch} className="px-5 py-4 space-y-4">
              {dispatchError && (
                <p className="text-sm text-destructive">{dispatchError}</p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Method *</Label>
                  <Select
                    value={dispatchMethod}
                    onValueChange={(v) =>
                      setDispatchMethod(v as typeof dispatchMethod)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {dispatchMethod === "company_transport"
                          ? "Company Transport"
                          : "Customer Pickup"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company_transport">
                        Company Transport
                      </SelectItem>
                      <SelectItem value="customer_pickup">
                        Customer Pickup
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dispatch Date *</Label>
                  <Input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vehicle</Label>
                  <Input
                    placeholder="e.g. LHR-1234"
                    value={dispatchVehicle}
                    onChange={(e) => setDispatchVehicle(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Driver</Label>
                  <Input
                    placeholder="Driver name"
                    value={dispatchDriver}
                    onChange={(e) => setDispatchDriver(e.target.value)}
                  />
                </div>
              </div>

              {/* Line quantities */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Quantities to dispatch
                </p>
                <div className="space-y-2">
                  {order.lines.map((line) => {
                    const remaining =
                      parseFloat(line.qtyOrdered) -
                      parseFloat(line.qtyDispatched);
                    return (
                      <div key={line.id} className="flex items-center gap-3">
                        <span className="text-sm flex-1">{line.productName}</span>
                        <span className="text-xs text-muted-foreground">
                          max {remaining.toFixed(3)} {line.productBaseUnit}
                        </span>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          max={remaining}
                          className="w-32"
                          placeholder="0.000"
                          value={dispatchQtys[line.id] ?? ""}
                          onChange={(e) =>
                            setDispatchQtys((prev) => ({
                              ...prev,
                              [line.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  placeholder="Any dispatch notes..."
                  rows={2}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={dispatchSubmitting}>
                  {dispatchSubmitting ? "Dispatching..." : "Dispatch"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDispatchForm(false);
                    setDispatchError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
    </div>
  );
}
