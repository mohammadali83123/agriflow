"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/money";

type Customer = {
  id: string;
  name: string;
  businessName: string | null;
  phone: string;
  city: string | null;
  creditLimitMinor: bigint | number;
  status: "active" | "inactive";
};

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.city?.toLowerCase().includes(q) ?? false) ||
      (c.businessName?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, city..."
          className="h-10 w-full rounded-xl border border-input bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-card py-20 text-center shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
            <Users className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {search ? "No customers found" : "No customers yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {search
              ? "Try a different name, phone, or city."
              : "Add your first customer to start tracking orders and payments."}
          </p>
          {!search && (
            <Link
              href="/customers/new"
              className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Add first customer
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Phone
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                  City
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                  Credit limit
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-3 py-3.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/customers/${c.id}`)}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-sm text-foreground">{c.name}</p>
                    {c.businessName && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.businessName}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {c.phone}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                    {c.city ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground hidden md:table-cell">
                    {formatRupees(c.creditLimitMinor)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                        c.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {c.status === "active" ? "Active" : "Inactive"}
                    </span>
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
