"use client";

import { useState, type ReactNode } from "react";
import { X, Menu } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";
import { Separator } from "@/components/ui/separator";
import type { NavItem } from "./nav-config";

interface MobileNavProps {
  navItems: NavItem[];
  settingsItem: NavItem;
  activeOrgName: string;
  orgSwitcher: ReactNode;
  userSection: ReactNode;
}

export function MobileNav({
  navItems,
  settingsItem,
  activeOrgName,
  orgSwitcher,
  userSection,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar — mobile only */}
      <header className="md:hidden sticky top-0 z-40 flex items-center h-14 px-4 border-b bg-background gap-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{activeOrgName}</p>
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-background border-r transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between h-14 px-4 border-b shrink-0">
          <span className="font-semibold text-sm tracking-tight">AgriFlow</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Org switcher in drawer */}
        <div className="px-3 py-3 border-b shrink-0" onClick={() => setOpen(false)}>
          {orgSwitcher}
        </div>

        {/* Nav */}
        <div
          className="flex-1 overflow-y-auto px-3 py-3"
          onClick={() => setOpen(false)}
        >
          <SidebarNav items={navItems} />
        </div>

        <Separator />

        <div className="px-3 py-3" onClick={() => setOpen(false)}>
          <SidebarNav items={[settingsItem]} />
        </div>

        <Separator />

        <div className="px-3 py-3 shrink-0">{userSection}</div>
      </div>
    </>
  );
}
