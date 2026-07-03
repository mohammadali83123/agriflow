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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/lib/rbac";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Products", href: "/products", icon: Tag },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Suppliers", href: "/suppliers", icon: Truck },
  { label: "Payments", href: "/payments", icon: Banknote },
  { label: "Production", href: "/production", icon: Factory },
];

// Operators see only the screens they act on daily
const OPERATOR_HREFS = new Set([
  "/dashboard",
  "/inventory",
  "/orders",
  "/payments",
]);

export function getNavItems(role: Role): NavItem[] {
  if (role === "owner") return ALL_NAV_ITEMS;
  return ALL_NAV_ITEMS.filter((item) => OPERATOR_HREFS.has(item.href));
}

export const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
};
