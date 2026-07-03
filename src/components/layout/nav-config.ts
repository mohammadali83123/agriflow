import type { Role } from "@/lib/rbac";

export interface NavItem {
  label: string;
  href: string;
  iconName: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", iconName: "LayoutDashboard" },
  { label: "Orders", href: "/orders", iconName: "ShoppingBag" },
  { label: "Inventory", href: "/inventory", iconName: "Package" },
  { label: "Products", href: "/products", iconName: "Tag" },
  { label: "Customers", href: "/customers", iconName: "Users" },
  { label: "Suppliers", href: "/suppliers", iconName: "Truck" },
  { label: "Payments", href: "/payments", iconName: "Banknote" },
  { label: "Production", href: "/production", iconName: "Factory" },
];

const OPERATOR_HREFS = new Set(["/dashboard", "/inventory", "/orders", "/payments"]);

export function getNavItems(role: Role): NavItem[] {
  if (role === "owner") return ALL_NAV_ITEMS;
  return ALL_NAV_ITEMS.filter((item) => OPERATOR_HREFS.has(item.href));
}

export const SETTINGS_ITEM: NavItem = {
  label: "Settings",
  href: "/settings",
  iconName: "Settings",
};
