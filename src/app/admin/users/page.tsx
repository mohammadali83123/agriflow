import { Users } from "lucide-react";
import { listAllUsersWithOrgCount } from "@/server/admin/actions";

export const metadata = { title: "Users — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await listAllUsersWithOrgCount();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {users.length} user{users.length !== 1 ? "s" : ""} on the platform
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
              <Users className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No users yet</p>
            <p className="text-sm text-muted-foreground">
              Users appear here once they sign up.
            </p>
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
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Orgs
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                    Signed up
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0">
                          {u.name?.charAt(0).toUpperCase() ?? "?"}
                        </div>
                        <p className="font-medium truncate">{u.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {u.email}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {u.orgCount}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs">
                      {new Date(u.createdAt).toLocaleDateString("en-PK")}
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
