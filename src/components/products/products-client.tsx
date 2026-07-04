"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Package, ChevronRight } from "lucide-react";
import { formatRupees } from "@/lib/money";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  baseUnit: string;
  basePriceMinor: number | null;
  status: "active" | "inactive";
};

interface ProductsClientProps {
  products: Product[];
}

export function ProductsClient({ products }: ProductsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or SKU..."
          className="h-10 w-full rounded-xl border border-input bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
            <Package className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {search ? "No products found" : "No products yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {search
              ? "Try a different name or SKU."
              : "Add the grains and products you sell."}
          </p>
          {!search && (
            <Link
              href="/products/new"
              className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Add first product
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Product
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                  SKU
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Base unit
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Base price
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-3 py-3.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/products/${p.id}`)}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-sm text-foreground">{p.name}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                    {p.sku ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {p.baseUnit}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium">
                    {p.basePriceMinor !== null ? formatRupees(p.basePriceMinor) : "—"}
                  </td>
                  <td className="px-5 py-4">
                    {p.status === "active" ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-emerald-500/30 bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-gray-300/60 bg-gray-50 text-gray-500">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
