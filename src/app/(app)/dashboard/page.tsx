import {
  ShoppingBag,
  Package,
  Banknote,
  TrendingUp,
  Package2,
  ClipboardList,
} from "lucide-react";
import { requireOrg } from "@/lib/db/scoped";
import { getUserOrganizations } from "@/lib/db/scoped";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { session, orgId, role } = await requireOrg();
  const orgs = await getUserOrganizations(session.user.id);
  const activeOrg = orgs.find((o) => o.id === orgId);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {activeOrg?.name ?? "Dashboard"}
        </h1>
        <p className="text-muted-foreground mt-0.5">
          Welcome back, {session.user.name}
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
    { label: "Sales today", value: "—", sub: "Rs 0", icon: TrendingUp },
    { label: "Outstanding", value: "—", sub: "0 customers", icon: Banknote },
    { label: "Inventory value", value: "—", sub: "0 products", icon: Package },
    {
      label: "Pending dispatch",
      value: "—",
      sub: "0 orders",
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground">
                  {kpi.label}
                </p>
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm font-medium mb-1">Recent activity</p>
        <p className="text-sm text-muted-foreground">
          Orders, payments, and dispatches will appear here.
        </p>
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
    },
    {
      label: "Process Order",
      desc: "Confirm or dispatch a pending order",
      icon: ClipboardList,
      href: "/orders",
    },
    {
      label: "Record Payment",
      desc: "Log a customer payment",
      icon: Banknote,
      href: "/payments/new",
    },
    {
      label: "Dispatch Order",
      desc: "Mark goods as loaded and sent",
      icon: ShoppingBag,
      href: "/orders?status=ready",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <a
            key={action.label}
            href={action.href}
            className="flex items-start gap-4 rounded-xl border bg-card p-5 transition-colors hover:bg-muted"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-medium text-sm">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {action.desc}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
