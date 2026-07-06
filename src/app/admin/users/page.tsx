import React from "react";
import { Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { listAllUsersGroupedByOrg } from "@/server/admin/actions";
import { DeleteUserButton } from "./delete-user-button";

export const metadata = { title: "Users — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { groups, noOrg } = await listAllUsersGroupedByOrg();
  const totalOrgs = groups.reduce((n, g) => n + g.orgs.length, 0);
  const totalUsers =
    groups.length +
    groups.reduce((n, g) => n + g.orgs.reduce((m, o) => m + o.nonOwnerMembers.length, 0), 0) +
    noOrg.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {totalUsers} user{totalUsers !== 1 ? "s" : ""} · {totalOrgs} business{totalOrgs !== 1 ? "es" : ""}
        </p>
      </div>

      {totalUsers === 0 ? (
        <div className="rounded-xl border bg-card shadow-sm flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
            <Users className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">No users yet</p>
          <p className="text-sm text-muted-foreground">Users appear here once they sign up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* One card per owner */}
          {groups.map((g) => (
            <div key={g.owner.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
              {/* Owner row */}
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
                    {g.owner.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{g.owner.name}</p>
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                        Owner
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {g.owner.email}
                      <span className="mx-1.5">·</span>
                      Joined {new Date(g.owner.createdAt).toLocaleDateString("en-PK")}
                    </p>
                  </div>
                </div>
                <DeleteUserButton userId={g.owner.id} userEmail={g.owner.email} />
              </div>

              {/* Businesses + their members */}
              {g.orgs.length > 0 && (
                <div className="border-t divide-y bg-muted/5">
                  {g.orgs.map((org) => (
                    <div key={org.orgId} className="px-5 py-3">
                      {/* Business name */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary shrink-0">
                          <Building2 className="size-3" />
                        </span>
                        <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                          {org.orgName}
                        </span>
                      </div>

                      {/* Non-owner members */}
                      {org.nonOwnerMembers.length > 0 ? (
                        <div className="ml-7 space-y-2 mt-2">
                          {org.nonOwnerMembers.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                                  {m.name?.charAt(0).toUpperCase() ?? "?"}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{m.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                </div>
                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border-border shrink-0">
                                  Member
                                </span>
                              </div>
                              <DeleteUserButton userId={m.id} userEmail={m.email} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="ml-7 text-xs text-muted-foreground/50 italic">No other members</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* No-org users */}
          {noOrg.length > 0 && (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-5 py-2.5 border-b bg-muted/30 flex items-center gap-2">
                <Users className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  No organization
                </span>
                <span className="text-xs text-muted-foreground">
                  · {noOrg.length} user{noOrg.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y">
                {noOrg.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                        {u.name?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.email}
                          <span className="mx-1.5">·</span>
                          Joined {new Date(u.createdAt).toLocaleDateString("en-PK")}
                        </p>
                      </div>
                    </div>
                    <DeleteUserButton userId={u.id} userEmail={u.email} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
