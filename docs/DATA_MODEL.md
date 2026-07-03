# Data Model

Core entities and their key columns. Claude Code turns these into Drizzle schema files
(one file per domain under `src/lib/db/schema/`). This is the intended shape, not literal
SQL — but the conventions below are mandatory.

## Conventions

- Every business table has: `id` (uuid or cuid), `org_id` (FK → organization), `created_at`,
  `updated_at`, `deleted_at` (nullable, for soft delete), and usually `created_by`.
- Money columns end in `_minor` and are `BIGINT` (paisa).
- Quantity columns are `numeric(14,3)` in the product's base unit.
- All FKs are `org_id`-consistent (a row and its references belong to the same org).
- Better Auth owns: `user`, `session`, `account`, `verification`, `organization`, `member`,
  `invitation`. Generate these with its CLI; do not hand-write them. Our tables use
  `org_id` referencing `organization.id`.

---

## Organization (extends Better Auth `organization`)
Better Auth provides core org fields. Add a profile table `organization_profile`:
`org_id, logo_url?, phone?, address?, currency (default 'PKR'), timezone, business_type,
ntn?, gst?, invoice_prefix, brand_color?, default_tax_rate? (nullable numeric, e.g. 0.17),
default_locale (default 'en')`.

## Product
`id, org_id, category, name, sku, description?, base_unit (e.g. 'kg'), status
(active|inactive), min_price_minor?, base_price_minor?, custom_fields (jsonb)`.

### Product variant (grade/quality/brand)
`id, org_id, product_id, name, grade?, quality?, brand?, attributes (jsonb), status`.

### Packaging option
`id, org_id, product_id, name (e.g. '50kg bag'), factor (numeric, base units per package)`.

### Daily price (append-only)
`id, org_id, product_id, variant_id?, price_minor, effective_date`.

### Customer price (negotiated, append-only)
`id, org_id, customer_id, product_id, variant_id?, price_minor, effective_from,
effective_to?`.

---

## Customer
`id, org_id, name, business_name?, phone, whatsapp?, city?, address?, credit_limit_minor
(default 0), payment_terms?, notes?, status`.

### Customer contact
`id, org_id, customer_id, name, role?, phone?, email?`.

### Customer delivery address
`id, org_id, customer_id, label, address, city?, is_default`.

(Outstanding balance, available credit, profitability are **derived**, not stored — see
ARCHITECTURE §7.)

---

## Supplier
`id, org_id, type (farmer|supplier|trader), name, business_name?, phone?, whatsapp?,
address?, payment_terms?, notes?, status`.

---

## Warehouse
`id, org_id, name, address?, is_default`.
(Sections/racks/shelves are future.)

---

## Inventory transaction (append-only — the source of truth)
`id, org_id, product_id, variant_id?, warehouse_id, quantity_delta (numeric, signed),
type (see ARCHITECTURE §4), reason?, ref_type?, ref_id?, unit_cost_minor?, batch_id?,
created_by, created_at`.

There is **no** mutable `inventory` quantity table. Optionally a derived
`inventory_balance` cache (product, variant, warehouse, available, reserved, avg_cost_minor)
updated inside the same transaction — but only if performance requires it.

### Batch (optional grouping for received stock)
`id, org_id, product_id, supplier_id?, batch_number, purchase_date?, manufacturing_date?,
grade?`.

---

## Order
`id, org_id, customer_id, status (draft|confirmed|reserved|ready|dispatched|delivered|
completed|cancelled), order_number, delivery_address_id?, notes?, credit_override (bool),
created_by, confirmed_at?, completed_at?`.

### Order line
`id, org_id, order_id, product_id, variant_id?, warehouse_id, packaging_option_id?,
qty_ordered (base units), qty_dispatched (base units, default 0), qty_delivered (base units,
default 0), unit_price_minor (SNAPSHOT), below_min_override (bool), line_total_minor`.

---

## Dispatch
`id, org_id, order_id, method (company_transport|customer_pickup), vehicle?, driver?,
dispatch_date, created_by`.

### Dispatch line
`id, org_id, dispatch_id, order_line_id, quantity (base units)`.

---

## Production (see ARCHITECTURE §11)

### Production batch
`id, org_id, warehouse_id, batch_number, production_date, added_cost_minor (default 0,
labor/fuel/packaging), allocation_method (value|weight|manual), notes?, status
(draft|completed), created_by`.

### Production input (consumed stock)
`id, org_id, batch_id, product_id, variant_id?, quantity (base units),
unit_cost_minor (snapshot of weighted-avg cost at consumption)`.
→ writes a `production_out` inventory transaction.

### Production output (produced stock + waste)
`id, org_id, batch_id, product_id?, variant_id?, quantity (base units),
allocated_cost_minor, is_waste (bool, default false)`.
→ non-waste outputs write a `production_in` inventory transaction at `allocated_cost_minor`.

---

## Invoice
`id, org_id, order_id?, customer_id, invoice_number, subtotal_minor, tax_enabled (bool,
default false), tax_rate? (nullable, overrides org default), tax_minor (default 0),
total_minor, status (open|partial|paid|void), issued_at`.
(Tax is optional and owner-controlled — see ARCHITECTURE §7a.)

## Payment
`id, org_id, customer_id, method (cash|bank_transfer|cheque|easypaisa|jazzcash|online),
amount_minor, type (full|partial|advance|credit), reference?, received_at, created_by`.

## Payment allocation (many-to-many payment ↔ invoice)
`id, org_id, payment_id, invoice_id, amount_minor`.

---

## Activity log (append-only)
`id, org_id, entity_type, entity_id, event, actor_id, metadata (jsonb), created_at`.

## Audit log (sensitive actions)
`id, org_id, actor_id, action, target_type, target_id, before (jsonb?), after (jsonb?),
created_at`.

---

## Derivation cheatsheet (do NOT store these as editable columns)
- Available stock = Σ inventory_transaction.quantity_delta affecting available, per product/warehouse
- Reserved stock = Σ reserve − Σ (dispatch against reserve) − Σ release
- Customer outstanding = Σ invoice.total_minor − Σ payment_allocation.amount_minor
- Available credit = credit_limit_minor − outstanding + unallocated advance payments
- Estimated profit = Σ (line revenue − line COGS at weighted-avg cost)
