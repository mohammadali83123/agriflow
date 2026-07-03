// Central UI string catalog. Every user-facing string goes through t().
// Ship English first. Adding Urdu later requires only filling in the ur catalog —
// no refactoring call-sites.

export type Locale = "en" | "ur";

const en = {
  // Common actions
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.search": "Search",
  "common.loading": "Loading...",
  "common.error": "Something went wrong. Please try again.",
  "common.empty": "No results",
  "common.confirm": "Confirm",
  "common.back": "Back",
  "common.create": "Create",
  "common.update": "Update",
  "common.actions": "Actions",
  "common.yes": "Yes",
  "common.no": "No",
  "common.required": "Required",
  "common.optional": "Optional",

  // Navigation
  "nav.dashboard": "Dashboard",
  "nav.products": "Products",
  "nav.customers": "Customers",
  "nav.suppliers": "Suppliers",
  "nav.inventory": "Inventory",
  "nav.orders": "Orders",
  "nav.payments": "Payments",
  "nav.settings": "Settings",

  // Auth
  "auth.signIn": "Sign in",
  "auth.signOut": "Sign out",
  "auth.signUp": "Create account",
  "auth.email": "Email address",
  "auth.password": "Password",
  "auth.forgotPassword": "Forgot password?",
  "auth.noAccount": "Don't have an account?",
  "auth.haveAccount": "Already have an account?",

  // Products
  "products.title": "Products",
  "products.create": "New product",
  "products.empty": "No products yet",
  "products.baseUnit": "Base unit",
  "products.basePrice": "Base price",
  "products.minPrice": "Minimum price",
  "products.sku": "SKU",
  "products.status.active": "Active",
  "products.status.inactive": "Inactive",

  // Customers
  "customers.title": "Customers",
  "customers.create": "New customer",
  "customers.empty": "No customers yet",
  "customers.creditLimit": "Credit limit",
  "customers.outstanding": "Outstanding balance",
  "customers.availableCredit": "Available credit",

  // Suppliers
  "suppliers.title": "Suppliers",
  "suppliers.create": "New supplier",
  "suppliers.empty": "No suppliers yet",

  // Inventory
  "inventory.title": "Inventory",
  "inventory.available": "Available",
  "inventory.reserved": "Reserved",
  "inventory.adjust": "Adjust stock",
  "inventory.purchase": "Record purchase",
  "inventory.opening": "Opening stock",
  "inventory.negativeStock": "Insufficient stock",

  // Orders
  "orders.title": "Orders",
  "orders.create": "New order",
  "orders.empty": "No orders yet",
  "orders.status.draft": "Draft",
  "orders.status.confirmed": "Confirmed",
  "orders.status.reserved": "Reserved",
  "orders.status.ready": "Ready",
  "orders.status.dispatched": "Dispatched",
  "orders.status.delivered": "Delivered",
  "orders.status.completed": "Completed",
  "orders.status.cancelled": "Cancelled",
  "orders.confirm": "Confirm order",
  "orders.cancel": "Cancel order",
  "orders.dispatch": "Dispatch",

  // Payments
  "payments.title": "Payments",
  "payments.record": "Record payment",
  "payments.empty": "No payments yet",
  "payments.method.cash": "Cash",
  "payments.method.bank_transfer": "Bank transfer",
  "payments.method.cheque": "Cheque",
  "payments.method.easypaisa": "Easypaisa",
  "payments.method.jazzcash": "JazzCash",
  "payments.method.online": "Online",

  // Validation
  "validation.required": "This field is required",
  "validation.minLength": "Too short",
  "validation.maxLength": "Too long",
  "validation.invalidEmail": "Invalid email address",
  "validation.positiveNumber": "Must be a positive number",
  "validation.noNegativeStock": "Quantity would exceed available stock",
  "validation.belowMinPrice": "Price is below the minimum allowed",
  "validation.creditLimitExceeded": "This order exceeds the customer's credit limit",
} as const;

export type StringKey = keyof typeof en;

const ur: Partial<typeof en> = {
  // Urdu translations added here later — missing keys fall back to English automatically
};

const catalogs: Record<Locale, Partial<typeof en>> = { en, ur };

let activeLocale: Locale = "en";

export function setLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getLocale(): Locale {
  return activeLocale;
}

/** Look up a UI string. Falls back to English if the active locale is missing the key. */
export function t(key: StringKey): string {
  return catalogs[activeLocale][key] ?? en[key];
}
