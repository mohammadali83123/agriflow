# Architecture

This document explains the parts of AgriFlow that are easy to get subtly wrong. If code
ever conflicts with this file, this file wins. Read alongside the GOLDEN RULES in CLAUDE.md.

---

## 1. Multi-tenancy

Single Postgres database, shared schema, `org_id` column on every business table.

- The active organization comes from the Better Auth session (organization plugin). Never
  from a URL param, header, or request body.
- All feature-level reads and writes go through `lib/db/scoped.ts`, which takes the session,
  resolves `org_id`, and injects `where org_id = :activeOrg` automatically. Feature code
  must not build raw Drizzle queries that could forget the filter.
- Enable Postgres **Row-Level Security** on all tenant tables as a second wall, using a
  session GUC (`SET app.current_org`) set per request. App-layer scoping is primary; RLS
  catches mistakes.
- Better Auth's own tables (user, session, organization, member, invitation) are managed by
  its CLI-generated schema. Our business tables reference `organization.id` as `org_id`.

**Test for every feature:** a user in Org A must get zero rows / a 404 when touching Org B's data.

---

## 2. Money

- Stored as integer **paisa** in `BIGINT` columns suffixed `_minor` (e.g. `amount_minor`,
  `unit_price_minor`). 1 rupee = 100 paisa.
- All arithmetic happens in paisa (integers). No floating point for money, ever.
- `lib/money.ts` provides `toMinor(rupees)`, `toRupees(minor)`, and a display formatter.
- Currency is PKR for v1. Keep a `currency` column on organization (default `PKR`) so the
  model is ready, but don't build multi-currency conversion yet.

---

## 3. Units & packaging

The single most important modeling decision. Get it wrong and every quantity is wrong.

- Each **product** has one immutable `base_unit` (e.g. `kg`).
- Quantities everywhere in the system are stored in the base unit as `numeric(14,3)`.
- A product has zero or more **packaging options**, each with a `factor` (base units per
  package) — e.g. `50kg bag` → factor 50, `maund` → factor 40, `ton` → factor 1000.
- Orders, dispatch, and pricing may be *expressed* in a packaging unit for UX, but are
  **converted to and stored in base units**. `lib/units.ts` does the conversion; conversion
  happens once at the boundary, and the base-unit value is the stored truth.
- Never let two parts of the system disagree on units. If a value can be ambiguous, it's a bug.

---

## 4. Inventory engine (event-sourced)

`server/inventory/engine.ts` is the only thing allowed to write inventory.

Table `inventory_transaction` (append-only) columns include:
`org_id, product_id, variant_id?, warehouse_id, quantity_delta (numeric, signed), type,
reason?, ref_type, ref_id, unit_cost_minor?, batch_id?, created_by, created_at`.

`type` ∈ `purchase | production_in | production_out | sale | reserve | release |
dispatch | transfer_in | transfer_out | adjustment | opening`.

Rules:
- Current available stock for (product, warehouse) = `SUM(quantity_delta)` where the
  transaction affects available stock. Reserved stock is tracked as its own running sum.
- **Available** and **Reserved** are two derived quantities:
  - Confirming an order inserts a `reserve` (available −qty, reserved +qty).
  - Dispatching inserts `dispatch` against reserved (reserved −qty, goods leave).
  - Cancelling an order inserts `release` (reserved −qty, available +qty).
- Before inserting any negative-going transaction, check the derived balance in the same
  DB transaction and reject if it would go negative. Do this with row locking
  (`SELECT ... FOR UPDATE` on a per-product-warehouse lock row) to avoid race conditions.
- Never `UPDATE inventory SET quantity = ...`. There is no mutable quantity column.

Performance note: for MVP, deriving from `SUM` is fine. If it gets slow later, add a
materialized `inventory_balance` cache updated in the same transaction — but the transaction
log stays the source of truth.

---

## 5. Cost basis & profit (COGS)

- Use **weighted average cost** per (product, warehouse) for MVP. Simplest correct choice.
- Each stock-increasing transaction (`purchase`, `production_in`, `opening`) carries a
  `unit_cost_minor`. Weighted-average cost = running `SUM(cost) / SUM(qty)` of stock on hand.
- When a `sale`/`dispatch` reduces stock, record the COGS at the current weighted-average
  cost so profit = revenue − COGS is derivable.
- FIFO and specific-batch costing are **future** — don't build them now, but keep
  `batch_id` and `unit_cost_minor` on transactions so we can migrate later.

---

## 6. Pricing resolution

At the moment an order line is created, resolve the unit price in this priority order:

1. Customer-specific negotiated price for that product (if set and not expired)
2. Today's daily price for that product (if set)
3. Product base/list price

Then **snapshot** the resolved `unit_price_minor` onto the order line. Later changes to any
price source must not alter existing lines. Enforce a per-product `min_price_minor`: selling
below it requires an explicit owner override flag recorded on the line.

Price history: daily prices and negotiated prices are append-only with effective dates, so
history is queryable.

---

## 7. Ledgers & payment allocation

`server/ledger/engine.ts` owns invoices, payments, and balances.

- An **invoice** is generated from an order; it creates ledger charges.
- A **payment** can be full/partial/advance. One payment may be allocated across multiple
  invoices; one invoice may receive multiple payments (many-to-many via
  `payment_allocation(payment_id, invoice_id, amount_minor)`).
- **Customer outstanding balance** is derived:
  `SUM(invoice.total_minor) − SUM(payment_allocation.amount_minor)` for that customer/org.
  Advance payments (unallocated) reduce net balance and sit as available credit.
- Never store a hand-edited running balance as the source of truth. Derive it; cache only if
  proven necessary, updated in the same transaction.
- Credit limit is checked at order confirmation. Exceeding it is blocked unless the owner
  sets an override flag on the order.

Double-entry accounting is explicitly **out of scope** for MVP. Simple ledger only.

### 7a. Tax (optional, owner-controlled)
No forced GST engine. The organization has an optional `default_tax_rate` (nullable). Each
invoice carries `tax_enabled` (bool) and an optional `tax_rate` override. When enabled,
`tax_minor = round(subtotal_minor * rate)` and `total_minor = subtotal_minor + tax_minor`.
When disabled, `tax_minor = 0` and total = subtotal. No input-tax/GST-credit accounting in
MVP — this is display + arithmetic on the invoice only.

---

## 8. Order lifecycle & state machine

States: `draft → confirmed → reserved → ready → dispatched → delivered → completed`,
plus `cancelled` reachable from any pre-dispatch state.

- `draft` does **not** reserve stock.
- `confirmed` runs credit check and price snapshotting.
- Reservation happens on confirm (or an explicit reserve step) via the inventory engine.
- Partial dispatch and partial delivery are supported: track ordered vs dispatched vs
  delivered quantities per line.
- `cancelled` releases all reservations for the order.
- Every transition writes to the order's **activity timeline** (see §9) and is guarded by
  RBAC (operators can process but not delete/cancel unless permitted).

---

## 9. Activity timeline & audit

- Key entities (order, invoice, payment, inventory item) maintain an append-only activity
  log: `entity_type, entity_id, event, actor_id, metadata, created_at`, all org-scoped.
- Separately, an audit log records sensitive actions (credit override, price-below-min,
  adjustments, user/role changes).

---

## 10. Onboarding real data (day 1)

The rice mill already has customers with outstanding balances and stock on the floor. The
system is useless if it can't represent reality on day one.

- **Opening stock:** an `opening` inventory transaction per product/warehouse with a
  `unit_cost_minor`. Provide a simple bulk-entry screen.
- **Opening balances:** a customer/supplier opening-balance ledger entry (an "opening"
  invoice or credit) so historical outstanding amounts are represented without inventing
  fake orders.
- CSV import is **future**; manual opening entries are enough for the first customer.

- CSV import is available from day one via a **reusable import pipeline** (§10a); manual
  opening entries also work for the first customer.

This is not optional polish — it's what makes adoption possible. See DECISIONS.md.

### 10a. Bulk import pipeline (reusable)
One pipeline, many consumers. Flow: upload CSV → map columns to fields → validate every row
with the entity's Zod schema → show a preview with per-row errors → commit valid rows in a
single DB transaction (org-scoped). Consumers: products, customers, suppliers, opening stock,
opening balances. Imports that create stock or balances go through the inventory/ledger
engines (never direct writes). Build it once in Sprint 3; reuse everywhere.

---

## 11. Production (milling) — simple version, IN the MVP

The mill both mills paddy into rice AND resells bought goods, so production originates stock
and must exist in the MVP. Keep it simple; full joint-cost accounting is future.

Tables: `production_batch`, `production_input`, `production_output` (see DATA_MODEL).

Flow:
- **Inputs** (e.g. paddy) are consumed from inventory as `production_out` transactions,
  valued at their current weighted-average cost. This is the input cost.
- **Outputs** (rice, broken rice, bran, husk, polish) enter inventory as `production_in`
  transactions. Waste/loss is recorded but does not enter inventory.
- **Cost pool** = total input cost + optional `added_cost_minor` (labor, fuel, packaging
  entered on the batch).
- **Allocation** of the cost pool across outputs, `allocation_method` ∈:
  - `value` (default): by each output's relative sale value — best for joint products
  - `weight`: by each output's share of total output weight
  - `manual`: owner enters cost per output directly
  The allocated per-output cost becomes that output's `unit_cost_minor`, feeding the
  weighted-average cost of the finished good (§5).
- Track `qty_in`, `qty_out`, waste, and derived **yield %** for reporting.

All input/output stock movements go through the inventory engine (§4) — production never
writes inventory directly.
