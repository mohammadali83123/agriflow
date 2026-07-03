import {
  bigint,
  date,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth";

// -- Enums ------------------------------------------------------------------

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "inactive",
]);

// -- Tables -----------------------------------------------------------------

export const product = pgTable("product", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category"),
  sku: text("sku"),
  description: text("description"),
  baseUnit: text("base_unit").notNull(),
  status: productStatusEnum("status").notNull().default("active"),
  minPriceMinor: bigint("min_price_minor", { mode: "bigint" }),
  basePriceMinor: bigint("base_price_minor", { mode: "bigint" }),
  customFields: jsonb("custom_fields"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: text("created_by").references(() => user.id),
});

export const productVariant = pgTable("product_variant", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  grade: text("grade"),
  quality: text("quality"),
  brand: text("brand"),
  attributes: jsonb("attributes"),
  status: productStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const packagingOption = pgTable("packaging_option", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // base units per package -- must be > 0; validated in application layer
  factor: numeric("factor", { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// append-only -- no updatedAt, no deletedAt
export const dailyPrice = pgTable("daily_price", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  variantId: text("variant_id").references(() => productVariant.id),
  // price per BASE UNIT in paisa
  priceMinor: bigint("price_minor", { mode: "bigint" }).notNull(),
  effectiveDate: date("effective_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by").references(() => user.id),
});

// -- RLS policies to run after migration:
// -- ALTER TABLE product ENABLE ROW LEVEL SECURITY;
// -- ALTER TABLE product_variant ENABLE ROW LEVEL SECURITY;
// -- ALTER TABLE packaging_option ENABLE ROW LEVEL SECURITY;
// -- ALTER TABLE daily_price ENABLE ROW LEVEL SECURITY;
