import type { ReactNode } from "react";
import { getUserOrganizations, requireOrg } from "@/lib/db/scoped";
import { OrganizationSwitcher } from "@/components/auth/organization-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { getNavItems, SETTINGS_ITEM } from "./nav-config";

export async function AppShell({ children }: { children: ReactNode }) {
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
      {/* Desktop sidebar */}
      <Sidebar
        navItems={navItems}
        settingsItem={SETTINGS_ITEM}
        orgSwitcher={orgSwitcher}
        userSection={userSection}
      />

      {/* Mobile nav (top bar + drawer) */}
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
  );
}
