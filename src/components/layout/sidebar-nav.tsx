"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  Users,
  Truck,
  Banknote,
  Factory,
  Settings,
  FileText,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  Users,
  Truck,
  Banknote,
  Factory,
  Settings,
  FileText,
  BarChart3,
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = ICON_MAP[item.iconName] ?? Package;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors w-full",
              active
                ? "bg-primary/8 text-primary font-medium border-l-[2px] border-primary pl-[14px]"
                : "text-muted-foreground hover:bg-accent hover:text-foreground font-normal"
            )}
          >
            <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
