import type { ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "./sidebar-nav";
import type { NavItem } from "./nav-config";

interface SidebarProps {
  navItems: NavItem[];
  settingsItem: NavItem;
  orgSwitcher: ReactNode;
  userSection: ReactNode;
}

export function Sidebar({
  navItems,
  settingsItem,
  orgSwitcher,
  userSection,
}: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r bg-background h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center h-14 px-4 border-b shrink-0">
        <span className="font-semibold text-sm tracking-tight">AgriFlow</span>
      </div>

      {/* Business switcher */}
      <div className="px-3 py-3 border-b shrink-0">{orgSwitcher}</div>

      {/* Main nav */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <SidebarNav items={navItems} />
      </div>

      <Separator />

      {/* Settings */}
      <div className="px-3 py-3">
        <SidebarNav items={[settingsItem]} />
      </div>

      <Separator />

      {/* User + sign out */}
      <div className="px-3 py-3 shrink-0">{userSection}</div>
    </aside>
  );
}
