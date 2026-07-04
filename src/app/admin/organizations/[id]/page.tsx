import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Building2,
  Users,
  Package,
  ShoppingCart,
  FileText,
  CreditCard,
  Calendar,
} from "lucide-react";
import { getOrgDetail } from "@/server/admin/actions";
import { formatRupees } from "@/lib/money";
import { CopyInviteButton } from "./copy-invite-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getOrgDetail(id);
  return { title: data ? `${data.org.name} — Admin` : "Not found — Admin" };
}

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getOrgDetail(id);

  if (!data) notFound();

  const { org, members, stats } = data;

  const statCards = [
    {
      label: "Products",
      value: stats.productCount,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Customers",
      value: stats.customerCount,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Orders",
      value: stats.orderCount,
      icon: ShoppingCart,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Invoices",
      value: stats.invoiceCount,
      icon: FileText,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Payments",
      value: stats.paymentCount,
      icon: CreditCard,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground group"
      >
        <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
        All organizations
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
            <div className="flex items-center gap-3 mt-0.5">
              {org.slug && (
                <span className="text-sm text-muted-foreground font-mono">
                  {org.slug}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                Created {new Date(org.createdAt).toLocaleDateString("en-PK")}
              </span>
            </div>
          </div>
        </div>
        {org.slug && <CopyInviteButton slug={org.slug} />}
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Usage stats</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`flex size-7 items-center justify-center rounded-md ${card.bg} ${card.color}`}
                >
                  <card.icon className="size-3.5" />
                </span>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {card.label}
                </p>
              </div>
              <p className="text-2xl font-bold tracking-tight">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Total invoiced */}
        <div className="mt-3 rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Total invoiced (all time)
          </p>
          <p className="text-2xl font-bold tracking-tight">
            {formatRupees(stats.invoiceTotalMinor)}
          </p>
        </div>
      </div>

      {/* Members */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">
            Members ({members.length})
          </h2>
        </div>

        {members.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No members yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    User
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                          {m.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{m.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {m.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.role === "owner"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">
                      {new Date(m.joinedAt).toLocaleDateString("en-PK")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
