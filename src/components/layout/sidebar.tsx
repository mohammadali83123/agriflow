import type { ReactNode } from "react";
import { Wheat, Search } from "lucide-react";
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
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r bg-sidebar h-screen sticky top-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-sidebar-border shrink-0">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
          <Wheat className="size-4" />
        </div>
        <span className="font-bold text-sm tracking-tight text-sidebar-foreground">
          AgriFlow
        </span>
      </div>

      {/* Business switcher */}
      <div className="px-3 py-2.5 border-b border-sidebar-border shrink-0">
        {orgSwitcher}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-sidebar-border shrink-0">
        <form action="/search" method="GET">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              name="q"
              placeholder="Search..."
              className="w-full rounded-md border bg-background pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </form>
      </div>

      {/* Main nav */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <SidebarNav items={navItems} />
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Settings */}
      <div className="px-2 py-2">
        <SidebarNav items={[settingsItem]} />
      </div>

      <Separator className="bg-sidebar-border" />

      {/* User + sign out */}
      <div className="px-3 py-3 shrink-0">{userSection}</div>

      {/* Brand footer */}
      <div className="px-4 py-2.5 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="flex size-4 items-center justify-center rounded bg-primary/15 text-primary shrink-0">
            <Wheat className="size-2.5" />
          </div>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">
            AgriFlow
          </span>
        </div>
      </div>
    </aside>
  );
}
