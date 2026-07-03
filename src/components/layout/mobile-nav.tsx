"use client";

import { useState, type ReactNode } from "react";
import { X, Menu, Wheat } from "lucide-react";
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
      <header className="md:hidden shrink-0 z-40 flex items-center h-14 px-4 border-b bg-background gap-3">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Menu className="size-5" />
        </button>

        {/* Brand mark in top bar */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
            <Wheat className="size-3.5" />
          </div>
          <p className="text-sm font-semibold truncate text-foreground">
            {activeOrgName}
          </p>
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <Wheat className="size-4" />
            </div>
            <span className="font-bold text-sm tracking-tight text-sidebar-foreground">
              AgriFlow
            </span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center size-9 rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Org switcher in drawer */}
        <div
          className="px-3 py-2.5 border-b border-sidebar-border shrink-0"
          onClick={() => setOpen(false)}
        >
          {orgSwitcher}
        </div>

        {/* Nav */}
        <div
          className="flex-1 overflow-y-auto px-2 py-3"
          onClick={() => setOpen(false)}
        >
          <SidebarNav items={navItems} />
        </div>

        <Separator className="bg-sidebar-border" />

        <div className="px-2 py-2" onClick={() => setOpen(false)}>
          <SidebarNav items={[settingsItem]} />
        </div>

        <Separator className="bg-sidebar-border" />

        <div className="px-3 py-3 pb-safe shrink-0">{userSection}</div>
      </div>
    </>
  );
}
