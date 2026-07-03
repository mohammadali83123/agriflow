# Sprints — build order

Build in vertical slices. Each sprint ends deployable. Commit in small chunks throughout
(see CLAUDE.md git workflow); the checkpoints below are minimums, not the only commits.

**Definition of done for every sprint:** builds, typechecks, lints, deploys, and the human
can complete the listed flow end-to-end against the real Neon DB.

> Note: Production is now a sprint (mill does both milling and trading). CSV import is built as
> a reusable pipeline in Sprint 3 and reused in 4–5. Tax is optional, handled in Sprint 8.

---

## ✅ Sprint 0 — Foundation
**Status: DONE** (commit: initial scaffold → Neon connected)

- [x] Next.js 16 (App Router, TS strict), Tailwind CSS v4, shadcn/ui v4 (base-ui).
- [x] Drizzle ORM + Neon serverless HTTP driver; `drizzle.config.ts` loads `.env.local` via dotenv.
- [x] `db:generate` / `db:migrate` / `db:studio` scripts in `package.json`.
- [x] `lib/money.ts`, `lib/units.ts`, `lib/i18n.ts` scaffold, base Zod.
- [x] ESLint, `typecheck` script, `.env.example`, `.gitignore`.
- [x] GitHub repo pushed, Vercel connected, Neon DB connected, deployed page live.
- [x] `.npmrc` with `legacy-peer-deps=true` (babel/core 7.x vs 8.x conflict).

**Deviations from plan:**
- Used `dotenv` in `drizzle.config.ts` explicitly (`drizzle-kit` doesn't auto-load `.env.local`).
- `drizzle-orm` pinned to `^0.45.2` (peer dep from `better-auth`).

---

## ✅ Sprint 1 — Auth & Organization
**Status: DONE** (commit: auth scaffold → session hooks → org guard)

- [x] Better Auth v1.6.23 + `organization` plugin. Auth schema hand-written (CLI can't resolve `@/` aliases).
- [x] Tables: `user`, `session` (with `activeOrganizationId`), `account`, `verification`,
      `organization`, `member`, `invitation`. Migration applied to Neon.
- [x] Email+password sign-up → onboarding (create org) → dashboard.
- [x] Sign-in → auto-resolve active org via `databaseHooks.session.create.before`.
- [x] Multi-business selector: 0 orgs → /onboarding, 1 org → auto-select, 2+ → /select-organization picker.
- [x] `lib/db/scoped.ts`: `getSession()`, `requireAuth()`, `requireOrg()` → returns `{ session, orgId, role, db }`.
- [x] `(auth)` route group (sign-in, sign-up, onboarding, select-organization) — no auth guard.
- [x] `(app)` route group with org guard via `requireOrg()` in each layout/page.
- [x] Proxy (`src/proxy.ts`) — edge-layer cookie check, fast redirect to sign-in.
      **Note:** Next.js 16 renamed `middleware.ts` → `proxy.ts`; export must be `proxy` not `middleware`.

**Deviations from plan:**
- Better Auth CLI (`@better-auth/cli generate`) fails silently on `@/` path aliases — schema hand-written instead.
- Slug gets random 4-char suffix to avoid global uniqueness collisions.
- `databaseHooks.session.create.before` added (not in original plan) to fix active org not persisting across sign-ins.

---

## ✅ Sprint 2 — RBAC, App Shell & Dashboard skeleton
**Status: DONE** (commit: d55a53f → security/mobile fixes → 09a5727)

- [x] `lib/rbac.ts`: `Role` (`owner | member`), `Permission` union, `can(role, permission)`, `roleLabel()`.
- [x] App shell: `app-shell.tsx` (server) → `sidebar.tsx` (desktop) + `mobile-nav.tsx` (mobile drawer).
- [x] Responsive layout: `flex h-screen` row → desktop sidebar | `flex-col` column (mobile top-bar + main).
- [x] `nav-config.ts`: `getNavItems(role)` returns serializable `{ label, href, iconName }` (not LucideIcon).
- [x] `sidebar-nav.tsx` (client): icon resolved from `ICON_MAP` — no React components cross server/client boundary.
- [x] Owner nav: 8 items. Operator nav: 4 items (Dashboard, Inventory, Orders, Payments).
- [x] Role-based dashboard: owner sees KPI grid; operator sees task-first action cards.
- [x] Business name in sidebar + `OrganizationSwitcher` dropdown.
- [x] `SignOutButton` shows name + roleLabel.
- [x] Vercel Analytics (`@vercel/analytics`).
- [x] Security headers in `next.config.ts` (X-Frame-Options, nosniff, HSTS, Referrer-Policy, Permissions-Policy).
- [x] `Viewport` export in root layout; iOS safe-area utilities in `globals.css`.
- [x] `docs/MOBILE.md` and `docs/SECURITY.md` created.

**Deviations from plan:**
- Postgres RLS deferred — no business tables yet (will happen Sprint 3+ as tables are created).
- `⌘K` global search placeholder deferred to Sprint 9 (no data to search yet).
- shadcn/ui v4 uses `@base-ui/react` — `DropdownMenuLabel` must be inside `DropdownMenuGroup`.
- Fixed RSC→client icon serialization bug: Lucide components can't cross the boundary; pass `iconName: string` instead.
- Mobile layout was broken at ship (hamburger rendered beside main, not above it); fixed in same sprint.

---

## 🔲 Sprint 3 — Products + reusable CSV import
**Status: NEXT**

- [ ] `lib/db/schema/products.ts`: product, product_variant, packaging_option, daily_price, customer_price.
- [ ] `lib/validations/products.ts`: Zod schemas for all product entities.
- [ ] `server/products/actions.ts`: CRUD Server Actions (create/update/soft-delete), protected by `requireOrg()` + `can()`.
- [ ] Product list page (`/products`): table with search + filter, empty state.
- [ ] Product create/edit form: base unit, packaging options, variants, min/base price.
- [ ] Daily price entry page + price history view (append-only, date-keyed).
- [ ] `lib/units.ts`: `toBaseUnit(qty, packaging)`, `fromBaseUnit(qty, packaging)` — fully working.
- [ ] **Reusable import pipeline** (`lib/import/`): upload → column-map → Zod validate → preview → commit.
- [ ] Wire CSV import to Products as first consumer.
- [ ] Postgres RLS on `product`, `product_variant`, `packaging_option`, `daily_price`, `customer_price`.
- [ ] Test: create rice in kg with 50kg-bag packaging + daily price; import products via CSV.

---

## 🔲 Sprint 4 — Customers & Suppliers
- Customer CRUD: multiple contacts, multiple delivery addresses, credit limit, notes.
- Supplier CRUD + type. Customer profile page (derived balance/credit sections, still empty).
- **Opening balance** entry for customers/suppliers (ARCHITECTURE §10).
- Reuse the import pipeline for customers & suppliers (and opening balances).

## 🔲 Sprint 5 — Inventory engine
- `inventory_transaction` table + `server/inventory/engine.ts` (the only writer).
- Purchase-in from supplier with `unit_cost_minor`; weighted-avg cost.
- **Opening stock** entry (manual + CSV import).
- Adjustments (damage/theft/sample/correction/audit). Warehouse CRUD.
- Derived available/reserved balances; negative-stock guard with row locking.
- Test: purchase 1000kg, adjust −20kg, balance = 980kg; cannot go negative.

## 🔲 Sprint 6 — Production (milling)
- `production_batch` + `production_input` + `production_output` (DATA_MODEL).
- Consuming inputs writes `production_out` inventory txns (valued at weighted-avg cost);
  outputs write `production_in` txns.
- Cost pool = input cost + optional added processing cost (labor/fuel), allocated across
  outputs by value (default) / by weight / manual. Track waste + yield %.
- Test: mill 1000kg paddy → 650kg rice + 120kg broken + 100kg bran + husk/polish + waste;
  input stock drops, finished-goods stock rises, costs allocated, yield shown.

## 🔲 Sprint 7 — Orders, reservation & dispatch
- Order lifecycle state machine (ARCHITECTURE §8). Price resolution + snapshot onto lines;
  min-price + credit-limit override flags.
- Confirm → reserve via inventory engine. Cancel → release.
- Partial dispatch + partial delivery; dispatch records. Order activity timeline.
- Test: confirm order (reserves stock); partial-dispatch; cancel releases remainder.

## 🔲 Sprint 8 — Invoices, Payments & Ledgers
- Invoice generation from orders. **Optional tax:** org default rate + per-invoice on/off +
  rate override; `tax_minor = round(subtotal_minor * rate)`.
- Payments (all methods) + payment↔invoice allocation (many-to-many). Advance/available credit.
- Customer & supplier ledgers; derived outstanding balances.
- Test: one payment across two invoices; partial payment leaves correct outstanding; toggle tax.

## 🔲 Sprint 9 — Reports & Dashboard
- KPIs: sales today/month, outstanding, inventory value, low stock, top customers, pending
  dispatch, estimated profit, credit exposure, production efficiency/yield.
- Owner dashboard + operator dashboard. Global search across core entities.

## After MVP (do NOT build now)
WhatsApp integration, notifications, customer portal, mobile app, barcode/QR, expenses,
multi-warehouse UI, FIFO/joint-cost accounting, full tax/GST engine, AI features.
