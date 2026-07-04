import {
  bigint,
  date,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organization } from "./auth";
import { user } from "./auth";
import { customer } from "./customers";
import { order, orderLine } from "./orders";

// -- Enums ------------------------------------------------------------------

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "partial",
  "overdue",
  "cancelled",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "cheque",
  "online",
]);

// -- Tables -----------------------------------------------------------------

export const invoice = pgTable("invoice", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(),
  orderId: text("order_id").references(() => order.id),
  customerId: text("customer_id")
    .notNull()
    .references(() => customer.id),
  status: invoiceStatusEnum("status").notNull().default("draft"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date"),
  subtotalMinor: bigint("subtotal_minor", { mode: "bigint" })
    .notNull()
    .default(sql`0`),
  taxRate: numeric("tax_rate", { precision: 5, scale: 4 }),
  taxMinor: bigint("tax_minor", { mode: "bigint" })
    .notNull()
    .default(sql`0`),
  totalMinor: bigint("total_minor", { mode: "bigint" })
    .notNull()
    .default(sql`0`),
  amountPaidMinor: bigint("amount_paid_minor", { mode: "bigint" })
    .notNull()
    .default(sql`0`),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: text("created_by").references(() => user.id),
});

export const invoiceLine = pgTable("invoice_line", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoice.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unitPriceMinor: bigint("unit_price_minor", { mode: "bigint" }).notNull(),
  lineTotalMinor: bigint("line_total_minor", { mode: "bigint" }).notNull(),
  orderLineId: text("order_line_id").references(() => orderLine.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payment = pgTable("payment", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  paymentNumber: text("payment_number").notNull(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customer.id),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  method: paymentMethodEnum("method").notNull().default("cash"),
  paymentDate: date("payment_date").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdBy: text("created_by").references(() => user.id),
});

export const paymentAllocation = pgTable("payment_allocation", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  paymentId: text("payment_id")
    .notNull()
    .references(() => payment.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoice.id, { onDelete: "cascade" }),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// -- RLS policies to run after migration:
// -- ALTER TABLE invoice ENABLE ROW LEVEL SECURITY;
// -- ALTER TABLE invoice_line ENABLE ROW LEVEL SECURITY;
// -- ALTER TABLE payment ENABLE ROW LEVEL SECURITY;
// -- ALTER TABLE payment_allocation ENABLE ROW LEVEL SECURITY;
