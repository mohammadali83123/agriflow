import { redirect } from "next/navigation";
import Link from "next/link";
import { Wheat, Building2, Users, ArrowLeft } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/db/scoped";

export const metadata = { title: "Platform Admin — AgriFlow" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Gate: non-admins are redirected to /dashboard
  await requirePlatformAdmin().catch(() => redirect("/dashboard"));

  return (
    <div className="min-h-screen bg-background">
      {/* Admin top bar */}
      <header className="h-14 border-b bg-card flex items-center gap-4 px-6 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wheat className="size-4" />
          </div>
          <span className="font-bold text-sm tracking-tight">AgriFlow</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Platform Admin
        </span>

        <nav className="flex items-center gap-1 ml-4">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Building2 className="size-3.5" />
            Orgs
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Users className="size-3.5" />
            Users
          </Link>
        </nav>

        <div className="ml-auto">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to app
          </Link>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
