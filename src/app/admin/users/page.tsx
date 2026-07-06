import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { listAllUsersWithOrgCount } from "@/server/admin/actions";
import { DeleteUserButton } from "./delete-user-button";

export const metadata = { title: "Users — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await listAllUsersWithOrgCount();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {users.length} user{users.length !== 1 ? "s" : ""} on the platform
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No users yet</p>
            <p className="text-sm text-muted-foreground">Users appear here once they sign up.</p>
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
                    Email
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Business
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Signed up
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => {
                  const primary = u.memberships[0];
                  const extra = u.memberships.length - 1;
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                            {u.name?.charAt(0).toUpperCase() ?? "?"}
                          </div>
                          <p className="font-medium truncate">{u.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3.5">
                        {primary ? (
                          <span className="text-sm">
                            {primary.orgName}
                            {extra > 0 && (
                              <span className="ml-1 text-xs text-muted-foreground">+{extra}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {primary ? (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                              primary.role === "owner"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {primary.role === "owner" ? "Owner" : "Member"}
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">
                        {new Date(u.createdAt).toLocaleDateString("en-PK")}
                      </td>
                      <td className="px-4 py-3.5">
                        <DeleteUserButton userId={u.id} userEmail={u.email} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
