import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserOrganizations, requireAuth, requireOrg } from "@/lib/db/scoped";
import { OrganizationSwitcher } from "@/components/auth/organization-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { getNavItems, SETTINGS_ITEM } from "./nav-config";

export async function AppShell({ children }: { children: ReactNode }) {
  // Platform admins go to /admin — they have no org and would hit requireOrg() here
  const earlySession = await requireAuth();
  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (adminEmails.includes(earlySession.user.email)) redirect("/admin");

  const { session, orgId, role } = await requireOrg();
  const orgs = await getUserOrganizations(session.user.id);
  const activeOrg = orgs.find((o) => o.id === orgId);
  const navItems = getNavItems(role);

  const orgSwitcher = (
    <OrganizationSwitcher organizations={orgs} activeOrgId={orgId} />
  );
  const userSection = (
    <SignOutButton name={session.user.name} role={role} />
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar
        navItems={navItems}
        settingsItem={SETTINGS_ITEM}
        orgSwitcher={orgSwitcher}
        userSection={userSection}
      />

      {/* Column: mobile top-bar + scrollable content */}
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        {/* Mobile top bar (hamburger + org name) — hidden on desktop */}
        <MobileNav
          navItems={navItems}
          settingsItem={SETTINGS_ITEM}
          activeOrgName={activeOrg?.name ?? "AgriFlow"}
          orgSwitcher={orgSwitcher}
          userSection={userSection}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
