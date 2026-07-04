"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Warehouse, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createWarehouse,
  updateWarehouse,
  type Warehouse as WarehouseType,
} from "@/server/inventory/actions";

interface WarehousesClientProps {
  warehouses: WarehouseType[];
}

export function WarehousesClient({ warehouses }: WarehousesClientProps) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Warehouse list */}
      {warehouses.length === 0 && !showCreateForm ? (
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Warehouse className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-base font-medium text-muted-foreground">
              No warehouses yet
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Create your first warehouse to start tracking stock locations.
            </p>
            <Button onClick={() => setShowCreateForm(true)} className="gap-2">
              <Plus className="size-4" />
              New warehouse
            </Button>
          </div>
        </div>
      ) : (
        <>
          {warehouses.length > 0 && (
            <div className="rounded-2xl border overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                      Address
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {warehouses.map((w) =>
                    editingId === w.id ? (
                      <tr key={w.id}>
                        <td colSpan={4} className="px-4 py-4">
                          <InlineEditForm
                            warehouse={w}
                            onSuccess={() => {
                              setEditingId(null);
                              router.refresh();
                            }}
                            onCancel={() => setEditingId(null)}
                          />
                        </td>
                      </tr>
                    ) : (
                      <tr
                        key={w.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-4 font-medium">{w.name}</td>
                        <td className="px-4 py-4 text-muted-foreground hidden sm:table-cell">
                          {w.address || "—"}
                        </td>
                        <td className="px-4 py-4">
                          {w.isDefault && (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Default
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditingId(w.id)}
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              <Plus className="size-4" />
              New warehouse
            </Button>
          </div>
        </>
      )}

      {/* Create form */}
      {showCreateForm && (
        <CreateWarehouseForm
          onSuccess={() => {
            setShowCreateForm(false);
            router.refresh();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline create form
// ---------------------------------------------------------------------------

function CreateWarehouseForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createWarehouse({ name, address, isDefault });
      if (result.error) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "Please check the form."
        );
        return;
      }
      onSuccess();
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="px-6 py-6 border-b">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            New warehouse
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Godown, Mill Warehouse"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Address (optional)</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Physical address or location"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="create-isDefault"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              <Label
                htmlFor="create-isDefault"
                className="text-sm font-medium cursor-pointer"
              >
                Set as default warehouse
              </Label>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-muted/20 flex items-center gap-3">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Creating..." : "Create warehouse"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Inline edit form
// ---------------------------------------------------------------------------

function InlineEditForm({
  warehouse,
  onSuccess,
  onCancel,
}: {
  warehouse: WarehouseType;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(warehouse.name);
  const [address, setAddress] = useState(warehouse.address ?? "");
  const [isDefault, setIsDefault] = useState(warehouse.isDefault);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateWarehouse(warehouse.id, {
        name,
        address,
        isDefault,
      });
      if (result.error) {
        setError(
          typeof result.error === "string"
            ? result.error
            : "Please check the form."
        );
        return;
      }
      onSuccess();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Warehouse name"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Address</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Location or address"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`edit-default-${warehouse.id}`}
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        <Label
          htmlFor={`edit-default-${warehouse.id}`}
          className="text-xs cursor-pointer"
        >
          Default warehouse
        </Label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
