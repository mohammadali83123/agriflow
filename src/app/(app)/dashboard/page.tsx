export const dynamic = "force-dynamic";

import {
  ShoppingBag,
  Package,
  Banknote,
  TrendingUp,
  Package2,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth, requireOrg } from "@/lib/db/scoped";
import { getUserOrganizations } from "@/lib/db/scoped";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  // Platform admins land on /admin, not here
  const session = await requireAuth();
  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (adminEmails.includes(session.user.email)) redirect("/admin");

  const { orgId, role } = await requireOrg();
  const orgs = await getUserOrganizations(session.user.id);
  const activeOrg = orgs.find((o) => o.id === orgId);

  const firstName = session.user.name.split(" ")[0];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight">
          {activeOrg?.name ?? "Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          Good to see you, {firstName}
        </p>
      </div>

      {role === "owner" ? (
        <OwnerDashboard />
      ) : (
        <OperatorDashboard />
      )}
    </div>
  );
}

function OwnerDashboard() {
  const kpis = [
    {
      label: "Sales today",
      value: "Rs —",
      sub: "No orders yet",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-l-emerald-500",
    },
    {
      label: "Outstanding",
      value: "Rs —",
      sub: "0 customers",
      icon: Banknote,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-l-amber-500",
    },
    {
      label: "Inventory value",
      value: "Rs —",
      sub: "0 products",
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-l-blue-500",
    },
    {
      label: "Pending dispatch",
      value: "—",
      sub: "0 orders",
      icon: ShoppingBag,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-l-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={cn(
                "rounded-xl border bg-card p-4 border-l-4 shadow-sm",
                kpi.border
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg",
                    kpi.bg,
                    kpi.color
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
              </div>
              <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Empty state — recent activity */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold">Recent activity</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
            <ClipboardList className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            No activity yet
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Orders, payments, and dispatches will appear here once you start
            operations.
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Add products", href: "/products", desc: "Set up your product catalog" },
          { label: "Add customers", href: "/customers", desc: "Register your buyers" },
          { label: "Add suppliers", href: "/suppliers", desc: "Register your input suppliers" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 hover:bg-muted/50 transition-colors group shadow-sm"
          >
            <div>
              <p className="text-sm font-medium">{link.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function OperatorDashboard() {
  const actions = [
    {
      label: "Receive Stock",
      desc: "Record a new purchase or stock arrival",
      icon: Package2,
      href: "/inventory/receive",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Process Order",
      desc: "Confirm or dispatch a pending order",
      icon: ClipboardList,
      href: "/orders",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Record Payment",
      desc: "Log a customer payment",
      icon: Banknote,
      href: "/payments/new",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Dispatch Order",
      desc: "Mark goods as loaded and sent",
      icon: ShoppingBag,
      href: "/orders?status=ready",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Quick actions
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-4 rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40 shadow-sm group"
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  action.bg,
                  action.color
                )}
              >
                <Icon className="size-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {action.desc}
                </p>
              </div>
              <ArrowRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
