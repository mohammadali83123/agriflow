// Role-based access control.
// Better Auth org plugin uses "owner" and "member" as its built-in role names.
// We map "member" → operator in product language; permissions reflect that.

export type Role = "owner" | "member";

export type Permission =
  // Products
  | "products:read"
  | "products:write"
  // Customers & suppliers
  | "customers:read"
  | "customers:write"
  | "suppliers:read"
  | "suppliers:write"
  // Inventory
  | "inventory:read"
  | "inventory:write"
  // Orders
  | "orders:read"
  | "orders:write"
  | "orders:confirm"
  | "orders:cancel"
  // Payments
  | "payments:read"
  | "payments:write"
  // Production
  | "production:read"
  | "production:write"
  // Reporting & settings
  | "reports:read"
  | "settings:read"
  | "settings:write"
  // Overrides (owner only — guards must check before allowing)
  | "price:override_min"
  | "credit:override_limit";

const OWNER_PERMISSIONS = new Set<Permission>([
  "products:read",
  "products:write",
  "customers:read",
  "customers:write",
  "suppliers:read",
  "suppliers:write",
  "inventory:read",
  "inventory:write",
  "orders:read",
  "orders:write",
  "orders:confirm",
  "orders:cancel",
  "payments:read",
  "payments:write",
  "production:read",
  "production:write",
  "reports:read",
  "settings:read",
  "settings:write",
  "price:override_min",
  "credit:override_limit",
]);

const MEMBER_PERMISSIONS = new Set<Permission>([
  "products:read",
  "customers:read",
  "suppliers:read",
  "inventory:read",
  "inventory:write",
  "orders:read",
  "orders:write",
  "orders:confirm",
  "payments:read",
  "payments:write",
  "production:read",
  "production:write",
]);

const PERMISSIONS: Record<Role, Set<Permission>> = {
  owner: OWNER_PERMISSIONS,
  member: MEMBER_PERMISSIONS,
};

/** Check whether a role holds a given permission. Works server-side and client-side. */
export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role]?.has(permission) ?? false;
}

/** Display label for the role (product language). */
export function roleLabel(role: Role): string {
  return role === "owner" ? "Owner" : "Operator";
}
