import Link from "next/link";
import { Plus, Building2, Users, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listAllOrgs, listAllUsers } from "@/server/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [orgs, users] = await Promise.all([listAllOrgs(), listAllUsers()]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {orgs.length} org{orgs.length !== 1 ? "s" : ""} · {users.length} user
            {users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/admin/orgs/new" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Onboard client
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm border-l-4 border-l-primary">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </span>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Organizations
            </p>
          </div>
          <p className="text-3xl font-bold tracking-tight">{orgs.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="size-4" />
            </span>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Users
            </p>
          </div>
          <p className="text-3xl font-bold tracking-tight">{users.length}</p>
        </div>
      </div>

      {/* Orgs table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">All organizations</h2>
          <Link href="/admin/orgs/new" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Plus className="size-3.5" />
            New
          </Link>
        </div>

        {orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
              <Building2 className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No organizations yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Onboard your first client to get started.
            </p>
            <Link href="/admin/orgs/new" className={cn(buttonVariants({ size: "sm" }))}>
              Onboard first client
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            {orgs.map((org) => (
              <div key={org.id} className="flex items-center px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0 mr-3">
                  <Building2 className="size-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{org.name}</p>
                  {org.slug && (
                    <p className="text-xs text-muted-foreground">{org.slug}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground shrink-0 ml-4">
                  {new Date(org.createdAt).toLocaleDateString("en-PK")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent users */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold">All users</h2>
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="divide-y">
          {users.slice(0, 10).map((u) => (
            <div key={u.id} className="flex items-center px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0 mr-3">
                {u.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <p className="text-xs text-muted-foreground shrink-0 ml-4">
                {new Date(u.createdAt).toLocaleDateString("en-PK")}
              </p>
            </div>
          ))}
          {users.length === 0 && (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">
              No users yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
