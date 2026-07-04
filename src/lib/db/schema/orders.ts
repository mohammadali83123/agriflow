import {
  bigint,
  boolean,
  date,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { customer, customerDeliveryAddress } from "./customers";
import { product, productVariant } from "./products";
import { warehouse } from "./inventory";

// -- Enums ------------------------------------------------------------------

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "confirmed",
  "reserved",
  "ready",
  "dispatched",
  "delivered",
  "completed",
  "cancelled",
]);

export const dispatchMethodEnum = pgEnum("dispatch_method", [
  "company_transport",
  "customer_pickup",
]);

// -- Tables -----------------------------------------------------------------

export const order = pgTable("order", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  // human-readable identifier, e.g. ORD-0001 — unique per org
  orderNumber: text("order_number").notNull(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customer.id),
  status: orderStatusEnum("status").notNull().default("draft"),
  deliveryAddressId: text("delivery_address_id").references(
    () => customerDeliveryAddress.id
  ),
  notes: text("notes"),
  // owner explicitly overrode credit-limit check on confirm
  creditOverride: boolean("credit_override").notNull().default(false),
  confirmedAt: timestamp("confirmed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: text("created_by").references(() => user.id),
});

export const orderLine = pgTable("order_line", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  orderId: text("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => product.id),
  variantId: text("variant_id").references(() => productVariant.id),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => warehouse.id),
  // packaging is informational — quantities are always in base units
  packagingOptionId: text("packaging_option_id"),
  // in product base units
  qtyOrdered: numeric("qty_ordered", { precision: 14, scale: 3 }).notNull(),
  qtyDispatched: numeric("qty_dispatched", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  qtyDelivered: numeric("qty_delivered", { precision: 14, scale: 3 })
    .notNull()
    .default("0"),
  // snapshot of resolved price at line creation — paisa per base unit (Golden Rule #5)
  unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
  // true when owner overrode the min-price guard
  belowMinOverride: boolean("below_min_override").notNull().default(false),
  // snapshot total in paisa: round(qtyOrdered * unitPriceMinor)
  lineTotalMinor: bigint("line_total_minor", { mode: "bigint" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // no deletedAt — lines are removed only while order is draft
});

export const dispatch = pgTable("dispatch", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  orderId: text("order_id")
    .notNull()
    .references(() => order.id),
  method: dispatchMethodEnum("method").notNull(),
  vehicle: text("vehicle"),
  driver: text("driver"),
  dispatchDate: date("dispatch_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by").references(() => user.id),
});

export const dispatchLine = pgTable("dispatch_line", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  dispatchId: text("dispatch_id")
    .notNull()
    .references(() => dispatch.id, { onDelete: "cascade" }),
  orderLineId: text("order_line_id")
    .notNull()
    .references(() => orderLine.id),
  // in product base units
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
});

// -- RLS policies to run after migration:
// -- ALTER TABLE "order" ENABLE ROW LEVEL SECURITY;
// -- ALTER TABLE order_line ENABLE ROW LEVEL SECURITY;
// -- ALTER TABLE dispatch ENABLE ROW LEVEL SECURITY;
// -- ALTER TABLE dispatch_line ENABLE ROW LEVEL SECURITY;
