"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
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
import { formatRupees } from "@/lib/money";
import {
  addInput,
  addOutput,
  removeInput,
  removeOutput,
  completeBatch,
  deleteBatch,
  getProductCost,
} from "@/server/production/actions";
import type { BatchDetail } from "@/server/production/actions";

type Product = {
  id: string;
  name: string;
  baseUnit: string;
  status: string;
  basePriceMinor: number | null;
};

interface Props {
  batch: BatchDetail;
  products: Product[];
}

function StatusBadge({ status }: { status: "draft" | "completed" }) {
  if (status === "completed") {
    return (
      <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700">
        Completed
      </span>
    );
  }
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700">
      Draft
    </span>
  );
}

const addInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().positive("Must be > 0"),
  unitCostRupees: z.number().nonnegative("Must be >= 0"),
});

type AddInputValues = z.infer<typeof addInputSchema>;

function AddInputForm({
  batchId,
  products,
  warehouseId,
  onAdded,
}: {
  batchId: string;
  products: Product[];
  warehouseId: string;
  onAdded: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<AddInputValues>({
    resolver: zodResolver(addInputSchema),
    defaultValues: { productId: "", quantity: 0, unitCostRupees: 0 },
  });

  const selectedProductId = watch("productId");

  const handleProductChange = async (productId: string | null) => {
    if (!productId) return;
    setValue("productId", productId);
    try {
      const result = await getProductCost(productId, warehouseId);
      setValue("unitCostRupees", result.costRupees);
    } catch {
      // ignore — cost stays at 0
    }
  };

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await addInput(batchId, values);
      if (result.error) {
        setServerError(
          typeof result.error === "string" ? result.error : "Failed to add input"
        );
        return;
      }
      reset();
      setShow(false);
      onAdded();
    });
  });

  if (!show) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setShow(true)}
      >
        <Plus className="size-3.5" />
        Add input
      </Button>
    );
  }

  const activeProducts = products.filter((p) => p.status === "active");

  return (
    <form onSubmit={onSubmit} className="border rounded-xl p-4 bg-muted/10 space-y-3 mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Add input
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Product *</Label>
          <Select<string>
            items={Object.fromEntries(activeProducts.map((p) => [p.id, p.name]))}
            onValueChange={(val) => { if (val) handleProductChange(val); }}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {activeProducts.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.productId && (
            <p className="text-xs text-destructive">{errors.productId.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">
            Quantity{" "}
            {selectedProductId && (
              <span className="text-muted-foreground">
                ({products.find((p) => p.id === selectedProductId)?.baseUnit})
              </span>
            )}
            *
          </Label>
          <Input
            type="number"
            step="0.001"
            min="0.001"
            className="h-9 text-sm"
            placeholder="0.000"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setValue("quantity", isNaN(v) ? 0 : v);
            }}
          />
          {errors.quantity && (
            <p className="text-xs text-destructive">{errors.quantity.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Unit cost (Rs) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="h-9 text-sm"
            placeholder="0.00"
            {...register("unitCostRupees", { valueAsNumber: true })}
          />
          {errors.unitCostRupees && (
            <p className="text-xs text-destructive">{errors.unitCostRupees.message}</p>
          )}
        </div>
      </div>

      {serverError && <p className="text-xs text-destructive">{serverError}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding..." : "Add"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setShow(false);
            reset();
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

const addOutputSchema = z.object({
  productId: z.string().optional(),
  quantity: z.number().positive("Must be > 0"),
  isWaste: z.boolean(),
  allocatedCostRupees: z.number().nonnegative().optional(),
});

type AddOutputValues = z.infer<typeof addOutputSchema>;

function AddOutputForm({
  batchId,
  products,
  allocationMethod,
  onAdded,
}: {
  batchId: string;
  products: Product[];
  allocationMethod: string;
  onAdded: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    register,
    formState: { errors },
  } = useForm<AddOutputValues>({
    resolver: zodResolver(addOutputSchema),
    defaultValues: { productId: "", quantity: 0, isWaste: false as boolean },
  });

  const isWaste = watch("isWaste");
  const selectedProductId = watch("productId");
  const activeProducts = products.filter((p) => p.status === "active");

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const payload = {
        ...values,
        productId: values.productId || undefined,
      };
      const result = await addOutput(batchId, payload);
      if (result.error) {
        setServerError(
          typeof result.error === "string" ? result.error : "Failed to add output"
        );
        return;
      }
      reset();
      setShow(false);
      onAdded();
    });
  });

  if (!show) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setShow(true)}
      >
        <Plus className="size-3.5" />
        Add output
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border rounded-xl p-4 bg-muted/10 space-y-3 mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Add output
      </p>

      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          id="isWaste"
          className="size-4"
          onChange={(e) => {
            setValue("isWaste", e.target.checked);
            if (e.target.checked) setValue("productId", "");
          }}
        />
        <Label htmlFor="isWaste" className="text-sm">
          Waste / loss (no inventory added)
        </Label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {!isWaste && (
          <div className="space-y-1">
            <Label className="text-xs">Product *</Label>
            <Select<string>
              items={Object.fromEntries(activeProducts.map((p) => [p.id, p.name]))}
              onValueChange={(val) => setValue("productId", val ?? undefined)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {activeProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">
            Quantity{" "}
            {!isWaste && selectedProductId && (
              <span className="text-muted-foreground">
                ({products.find((p) => p.id === selectedProductId)?.baseUnit})
              </span>
            )}
            *
          </Label>
          <Input
            type="number"
            step="0.001"
            min="0.001"
            className="h-9 text-sm"
            placeholder="0.000"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setValue("quantity", isNaN(v) ? 0 : v);
            }}
          />
          {errors.quantity && (
            <p className="text-xs text-destructive">{errors.quantity.message}</p>
          )}
        </div>

        {allocationMethod === "manual" && !isWaste && (
          <div className="space-y-1">
            <Label className="text-xs">Allocated cost (Rs)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              className="h-9 text-sm"
              placeholder="0.00"
              {...register("allocatedCostRupees", { valueAsNumber: true })}
            />
          </div>
        )}
      </div>

      {serverError && <p className="text-xs text-destructive">{serverError}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Adding..." : "Add"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setShow(false);
            reset();
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function BatchDetailClient({ batch, products }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDraft = batch.status === "draft";
  const hasInputs = batch.inputs.length > 0;
  const hasOutputs = batch.outputs.length > 0;
  const canComplete = isDraft && hasInputs && hasOutputs;

  const totalInputCostMinor = batch.inputs.reduce((sum, inp) => {
    const qty = parseFloat(inp.quantity as string);
    const cost = inp.unitCostMinor ?? 0;
    return sum + Math.round(qty * cost);
  }, 0);

  const addedCostMinor = batch.addedCostMinor;
  const costPoolMinor = totalInputCostMinor + addedCostMinor;

  const totalInputQty = batch.inputs.reduce(
    (sum, i) => sum + parseFloat(i.quantity as string),
    0
  );
  const totalNonWasteOutputQty = batch.outputs
    .filter((o) => !o.isWaste)
    .reduce((sum, o) => sum + parseFloat(o.quantity as string), 0);

  const yieldPercent =
    totalInputQty > 0 ? (totalNonWasteOutputQty / totalInputQty) * 100 : 0;

  const handleRemoveInput = (inputId: string) => {
    startTransition(async () => {
      const result = await removeInput(inputId);
      if (result.error) {
        setError(typeof result.error === "string" ? result.error : "Failed");
        return;
      }
      router.refresh();
    });
  };

  const handleRemoveOutput = (outputId: string) => {
    startTransition(async () => {
      const result = await removeOutput(outputId);
      if (result.error) {
        setError(typeof result.error === "string" ? result.error : "Failed");
        return;
      }
      router.refresh();
    });
  };

  const handleComplete = () => {
    setError(null);
    startTransition(async () => {
      const result = await completeBatch(batch.id);
      if (result.error) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "Failed to complete batch"
        );
        return;
      }
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this draft batch? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteBatch(batch.id);
      if (result.error) {
        setError(typeof result.error === "string" ? result.error : "Failed to delete");
        return;
      }
      router.push("/production");
    });
  };

  const refresh = () => router.refresh();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">
            {batch.batchNumber}
          </h1>
          <StatusBadge status={batch.status} />
          <span className="text-sm text-muted-foreground">
            {new Date(batch.productionDate).toLocaleDateString("en-PK", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="text-sm text-muted-foreground">
            · {batch.warehouseName}
          </span>
        </div>
        {isDraft && (
          <div className="flex items-center gap-2">
            {canComplete && (
              <Button
                onClick={handleComplete}
                disabled={isPending}
                className="gap-2"
              >
                <CheckCircle className="size-4" />
                {isPending ? "Completing..." : "Complete batch"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {batch.notes && (
        <p className="text-sm text-muted-foreground">{batch.notes}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs panel */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Inputs consumed</h2>
            <span className="text-xs text-muted-foreground">
              {batch.inputs.length} item{batch.inputs.length !== 1 ? "s" : ""}
            </span>
          </div>

          {batch.inputs.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/20">
                <tr>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Product
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Qty
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Unit cost
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Total
                  </th>
                  {isDraft && <th className="py-2.5 px-2" />}
                </tr>
              </thead>
              <tbody className="divide-y">
                {batch.inputs.map((inp) => {
                  const qty = parseFloat(inp.quantity as string);
                  const cost = inp.unitCostMinor ?? 0;
                  const totalMinor = Math.round(qty * cost);
                  return (
                    <tr key={inp.id} className="hover:bg-muted/10">
                      <td className="py-3 px-4 font-medium">
                        {inp.productName}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({inp.baseUnit})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {qty.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                        {formatRupees(cost)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {formatRupees(totalMinor)}
                      </td>
                      {isDraft && (
                        <td className="py-3 px-2">
                          <button
                            onClick={() => handleRemoveInput(inp.id)}
                            disabled={isPending}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t bg-muted/10">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-xs font-semibold text-muted-foreground">
                    Total input cost
                  </td>
                  <td className="py-3 px-4 text-right font-semibold tabular-nums">
                    {formatRupees(totalInputCostMinor)}
                  </td>
                  {isDraft && <td />}
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No inputs added yet
            </div>
          )}

          {isDraft && (
            <div className="px-4 py-3 border-t bg-muted/10">
              <AddInputForm
                batchId={batch.id}
                products={products}
                warehouseId={batch.warehouseId}
                onAdded={refresh}
              />
            </div>
          )}
        </div>

        {/* Outputs panel */}
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Outputs produced</h2>
            <span className="text-xs text-muted-foreground">
              {batch.outputs.length} item{batch.outputs.length !== 1 ? "s" : ""}
            </span>
          </div>

          {batch.outputs.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/20">
                <tr>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Product
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Qty
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Alloc. cost
                  </th>
                  {isDraft && <th className="py-2.5 px-2" />}
                </tr>
              </thead>
              <tbody className="divide-y">
                {batch.outputs.map((out) => {
                  const qty = parseFloat(out.quantity as string);
                  return (
                    <tr key={out.id} className="hover:bg-muted/10">
                      <td className="py-3 px-4 font-medium">
                        {out.isWaste ? (
                          <span className="text-muted-foreground italic">
                            Waste / loss
                          </span>
                        ) : (
                          out.productName ?? "—"
                        )}
                        {out.isWaste && (
                          <span className="ml-2 text-xs rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                            waste
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {qty.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                        {out.isWaste
                          ? "—"
                          : batch.status === "completed"
                          ? formatRupees(out.allocatedCostMinor)
                          : "—"}
                      </td>
                      {isDraft && (
                        <td className="py-3 px-2">
                          <button
                            onClick={() => handleRemoveOutput(out.id)}
                            disabled={isPending}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No outputs added yet
            </div>
          )}

          {isDraft && (
            <div className="px-4 py-3 border-t bg-muted/10">
              <AddOutputForm
                batchId={batch.id}
                products={products}
                allocationMethod={batch.allocationMethod}
                onAdded={refresh}
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary panel */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">Batch summary</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Input cost</p>
            <p className="font-semibold tabular-nums">
              {formatRupees(totalInputCostMinor)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Added cost</p>
            <p className="font-semibold tabular-nums">
              {formatRupees(addedCostMinor)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total cost pool</p>
            <p className="font-semibold tabular-nums">
              {formatRupees(costPoolMinor)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Allocation</p>
            <p className="font-semibold capitalize">{batch.allocationMethod}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total input qty</p>
            <p className="font-semibold tabular-nums">
              {totalInputQty.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Non-waste output qty
            </p>
            <p className="font-semibold tabular-nums">
              {totalNonWasteOutputQty.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Yield</p>
            <p
              className={`font-semibold tabular-nums ${
                yieldPercent > 100 ? "text-destructive" : ""
              }`}
            >
              {totalInputQty > 0 ? `${yieldPercent.toFixed(1)}%` : "—"}
              {yieldPercent > 100 && (
                <span className="ml-1 text-xs">⚠ &gt;100%</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
