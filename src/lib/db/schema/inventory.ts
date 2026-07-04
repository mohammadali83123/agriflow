import {
  bigint,
  boolean,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth";
import { product, productVariant } from "./products";

// -- Enums ------------------------------------------------------------------

export const inventoryTransactionTypeEnum = pgEnum(
  "inventory_transaction_type",
  [
    "purchase",
    "production_in",
    "production_out",
    "sale",
    "reserve",
    "release",
    "dispatch",
    "transfer_in",
    "transfer_out",
    "adjustment",
    "opening",
  ]
);

// -- Tables -----------------------------------------------------------------

export const warehouse = pgTable("warehouse", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: text("created_by").references(() => user.id),
});

// append-only — NO updated_at, NO deleted_at (see CLAUDE.md Golden Rule #4)
export const inventoryTransaction = pgTable("inventory_transaction", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => product.id),
  variantId: text("variant_id").references(() => productVariant.id),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => warehouse.id),
  // positive = stock in, negative = stock out — signed deltas encode direction
  quantityDelta: numeric("quantity_delta", {
    precision: 14,
    scale: 3,
  }).notNull(),
  type: inventoryTransactionTypeEnum("type").notNull(),
  reason: text("reason"),
  // what entity triggered this transaction (e.g. 'order', 'purchase', 'production_batch')
  refType: text("ref_type"),
  // id of the referenced entity
  refId: text("ref_id"),
  // cost per base unit in paisa — used for weighted-average cost calculation
  unitCostMinor: bigint("unit_cost_minor", { mode: "bigint" }),
  // future: batch/lot tracking
  batchId: text("batch_id"),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- RLS policies to run after migration:
// -- ALTER TABLE warehouse ENABLE ROW LEVEL SECURITY;
// -- ALTER TABLE inventory_transaction ENABLE ROW LEVEL SECURITY;
