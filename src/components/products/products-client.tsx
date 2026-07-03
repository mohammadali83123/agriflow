"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatRupees } from "@/lib/money";
import { Search } from "lucide-react";

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
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground text-sm">
            {search ? "No products match your search." : "No products yet."}
          </p>
          {!search && (
            <Link
              href="/products/new"
              className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Create your first product
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  SKU
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Base unit
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Base price
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.sku ?? "—"}
                  </td>
                  <td className="px-4 py-3">{p.baseUnit}</td>
                  <td className="px-4 py-3">
                    {p.basePriceMinor !== null
                      ? formatRupees(p.basePriceMinor)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "active" ? (
                      <Badge className="bg-green-100 text-green-800 border-transparent hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/products/${p.id}`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Edit
                    </Link>
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
