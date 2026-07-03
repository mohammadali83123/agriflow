import {
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organization } from "./auth";
import { user } from "./auth";

export const supplierTypeEnum = pgEnum("supplier_type", [
  "farmer",
  "supplier",
  "trader",
]);

export const supplierStatusEnum = pgEnum("supplier_status", [
  "active",
  "inactive",
]);

export const supplier = pgTable("supplier", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  type: supplierTypeEnum("type").notNull(),
  name: text("name").notNull(),
  businessName: text("business_name"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  address: text("address"),
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  status: supplierStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: text("created_by").references(() => user.id),
});
