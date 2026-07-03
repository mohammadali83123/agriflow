import { requireOrg } from "@/lib/db/scoped";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { session } = await requireOrg();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="font-semibold text-sm">AgriFlow</span>
          <SignOutButton name={session.user.name} />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session.user.name}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {["Sales today", "Outstanding", "Inventory", "Pending dispatch"].map(
            (label) => (
              <div
                key={label}
                className="rounded-xl border bg-card p-5 space-y-1"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold">—</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
