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
import { product, productVariant } from "./products";
import { warehouse } from "./inventory";

export const allocationMethodEnum = pgEnum("allocation_method", [
  "value",
  "weight",
  "manual",
]);

export const batchStatusEnum = pgEnum("batch_status", ["draft", "completed"]);

export const productionBatch = pgTable("production_batch", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  batchNumber: text("batch_number").notNull(),
  warehouseId: text("warehouse_id").notNull().references(() => warehouse.id),
  productionDate: date("production_date").notNull(),
  // stored in paisa; application always supplies 0n or a real value — no DB-level bigint default
  addedCostMinor: bigint("added_cost_minor", { mode: "bigint" }).notNull(),
  allocationMethod: allocationMethodEnum("allocation_method").notNull().default("value"),
  notes: text("notes"),
  status: batchStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: text("created_by").references(() => user.id),
});

export const productionInput = pgTable("production_input", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  batchId: text("batch_id").notNull().references(() => productionBatch.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => product.id),
  variantId: text("variant_id").references(() => productVariant.id),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unitCostMinor: bigint("unit_cost_minor", { mode: "bigint" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const productionOutput = pgTable("production_output", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  batchId: text("batch_id").notNull().references(() => productionBatch.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => product.id),
  variantId: text("variant_id").references(() => productVariant.id),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  // application always supplies 0n or an allocated value — no DB-level bigint default
  allocatedCostMinor: bigint("allocated_cost_minor", { mode: "bigint" }).notNull(),
  isWaste: boolean("is_waste").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
