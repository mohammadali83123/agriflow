# Sprints — build order

Build in vertical slices. Each sprint ends deployable. Commit in small chunks throughout
(see CLAUDE.md git workflow); the checkpoints below are minimums, not the only commits.

**Definition of done for every sprint:** builds, typechecks, lints, deploys, and the human
can complete the listed flow end-to-end against the real Neon DB.

> Note: Production is now a sprint (mill does both milling and trading). CSV import is built as
> a reusable pipeline in Sprint 3 and reused in 4–5. Tax is optional, handled in Sprint 8.

---

## Sprint 0 — Foundation
- Init Next.js (App Router, TS strict), Tailwind, shadcn/ui.
- Drizzle + Neon connection, `drizzle.config.ts`, `db:generate`/`db:migrate` scripts.
- `lib/money.ts`, `lib/units.ts`, `lib/i18n.ts` (string catalog scaffold), base Zod setup.
- ESLint, Prettier, `typecheck` script. `.env.example`. `.gitignore`. `.claude/settings.json`.
- Init GitHub repo, push, connect Vercel, verify a deployed page.

## Sprint 1 — Auth & Organization
- Better Auth (email+password) + `organization` plugin; run `@better-auth/cli generate`.
- Sign-up creates user + first organization (creator = owner). Sign-in/out, session.
- Active-organization resolution; `lib/db/scoped.ts` scaffolded and used by a test query.
- `(auth)` and protected `(app)` route groups with an org guard.

## Sprint 2 — RBAC, App Shell & Dashboard skeleton
- Owner vs Operator permissions; a `can()` helper (server + client).
- App shell: responsive sidebar, top bar, ⌘K/global-search placeholder, mobile layout.
- **Role-based shell:** operators see a simplified task-first nav; owners see full nav.
- Empty dashboard with KPI placeholders. Enable Postgres RLS on tenant tables.

## Sprint 3 — Products + reusable CSV import
- Product CRUD: dynamic per-product base unit, packaging options, variants, custom fields,
  base/min price. Daily price entry (append-only) + price history view.
- Unit conversion via `lib/units.ts`.
- **Build the reusable import pipeline here** (upload → column-map → Zod validate → preview →
  commit, with row-level error reporting). Wire it to Products as the first consumer.
- Test: create a product in kg with a 50kg-bag packaging + a daily price; import products via CSV.

## Sprint 4 — Customers & Suppliers
- Customer CRUD: multiple contacts, multiple delivery addresses, credit limit, notes.
- Supplier CRUD + type. Customer profile page (derived balance/credit sections, still empty).
- **Opening balance** entry for customers/suppliers (ARCHITECTURE §10).
- Reuse the import pipeline for customers & suppliers (and opening balances).

## Sprint 5 — Inventory engine
- `inventory_transaction` table + `server/inventory/engine.ts` (the only writer).
- Purchase-in from supplier with `unit_cost_minor`; weighted-avg cost.
- **Opening stock** entry (manual + CSV import).
- Adjustments (damage/theft/sample/correction/audit). Warehouse CRUD.
- Derived available/reserved balances; negative-stock guard with row locking.
- Test: purchase 1000kg, adjust −20kg, balance = 980kg; cannot go negative.

## Sprint 6 — Production (milling)
- `production_batch` + `production_input` + `production_output` (DATA_MODEL).
- Consuming inputs writes `production_out` inventory txns (valued at weighted-avg cost);
  outputs write `production_in` txns.
- Cost pool = input cost + optional added processing cost (labor/fuel), allocated across
  outputs by value (default) / by weight / manual. Track waste + yield %.
- Test: mill 1000kg paddy → 650kg rice + 120kg broken + 100kg bran + husk/polish + waste;
  input stock drops, finished-goods stock rises, costs allocated, yield shown.

## Sprint 7 — Orders, reservation & dispatch
- Order lifecycle state machine (ARCHITECTURE §8). Price resolution + snapshot onto lines;
  min-price + credit-limit override flags.
- Confirm → reserve via inventory engine. Cancel → release.
- Partial dispatch + partial delivery; dispatch records. Order activity timeline.
- Test: confirm order (reserves stock); partial-dispatch; cancel releases remainder.

## Sprint 8 — Invoices, Payments & Ledgers
- Invoice generation from orders. **Optional tax:** org default rate + per-invoice on/off +
  rate override; `tax_minor = round(subtotal_minor * rate)`.
- Payments (all methods) + payment↔invoice allocation (many-to-many). Advance/available credit.
- Customer & supplier ledgers; derived outstanding balances.
- Test: one payment across two invoices; partial payment leaves correct outstanding; toggle tax.

## Sprint 9 — Reports & Dashboard
- KPIs: sales today/month, outstanding, inventory value, low stock, top customers, pending
  dispatch, estimated profit, credit exposure, production efficiency/yield.
- Owner dashboard + operator dashboard. Global search across core entities.

## After MVP (do NOT build now)
WhatsApp integration, notifications, customer portal, mobile app, barcode/QR, expenses,
multi-warehouse UI, FIFO/joint-cost accounting, full tax/GST engine, AI features.
