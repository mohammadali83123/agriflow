"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Truck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Supplier = {
  id: string;
  name: string;
  businessName: string | null;
  type: "farmer" | "supplier" | "trader";
  phone: string | null;
  paymentTerms: string | null;
  status: "active" | "inactive";
};

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  farmer: { label: "Farmer", className: "bg-green-100 text-green-800" },
  supplier: { label: "Supplier", className: "bg-blue-100 text-blue-800" },
  trader: { label: "Trader", className: "bg-orange-100 text-orange-800" },
};

export function SuppliersTable({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = suppliers.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone?.includes(q) ?? false) ||
      (s.businessName?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="h-10 w-full rounded-xl border border-input bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
            <Truck className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {search ? "No suppliers found" : "No suppliers yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {search
              ? "Try a different name or phone."
              : "Add farmers, suppliers, and traders you purchase from."}
          </p>
          {!search && (
            <Link
              href="/suppliers/new"
              className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Add first supplier
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Supplier
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                  Phone
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                  Payment terms
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-3 py-3.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((s) => {
                const typeConfig = TYPE_CONFIG[s.type] ?? TYPE_CONFIG.supplier;
                return (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/suppliers/${s.id}`)}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-sm text-foreground">{s.name}</p>
                      {s.businessName && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.businessName}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          typeConfig.className
                        )}
                      >
                        {typeConfig.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                      {s.phone ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground hidden md:table-cell">
                      {s.paymentTerms ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          s.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {s.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
