import Link from "next/link";
import { Plus, Building2, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listAllOrgsWithStats } from "@/server/admin/actions";

export const metadata = { title: "Organizations — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  const orgs = await listAllOrgsWithStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {orgs.length} organization{orgs.length !== 1 ? "s" : ""} on the platform
          </p>
        </div>
        <Link href="/admin/orgs/new" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Onboard client
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Organization
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Owner
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Members
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Invoices
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Payments
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Created
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {orgs.map((org) => (
                  <tr
                    key={org.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                          <Building2 className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{org.name}</p>
                          {org.slug && (
                            <p className="text-xs text-muted-foreground">
                              {org.slug}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {org.ownerEmail ?? (
                        <span className="text-xs italic text-muted-foreground/60">
                          no owner
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {org.memberCount}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {org.invoiceCount}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {org.paymentCount}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">
                      {new Date(org.createdAt).toLocaleDateString("en-PK")}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View
                        <ChevronRight className="size-3" />
                      </Link>
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
