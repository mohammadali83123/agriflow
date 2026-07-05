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

## ✅ Sprint 3 — Products + reusable CSV import
**Status: DONE**

- [x] `lib/db/schema/products.ts`: product, product_variant, packaging_option, daily_price, customer_price.
- [x] `lib/validations/products.ts`: Zod schemas for all product entities.
- [x] `server/products/actions.ts`: CRUD Server Actions, protected by `requireOrg()` + `can()`.
- [x] Product list page, create/edit form, daily price entry, price history view.
- [x] `lib/units.ts`: `toBaseUnit()`, `fromBaseUnit()` fully working.
- [x] Reusable import pipeline (`lib/import/`): upload → column-map → Zod validate → preview → commit.
- [x] CSV import wired to Products as first consumer.

---

## ✅ Sprint 4 — Customers & Suppliers
**Status: DONE**

- [x] Customer CRUD: contacts, delivery addresses, credit limit, notes.
- [x] Supplier CRUD + type. Customer/supplier profile pages.
- [x] Opening balance entry for customers/suppliers.
- [x] CSV import for customers & suppliers.

---

## ✅ Sprint 5 — Inventory engine
**Status: DONE**

- [x] `inventory_transaction` table + `server/inventory/engine.ts` (sole writer).
- [x] Purchase-in from supplier with `unit_cost_minor`; weighted-avg cost.
- [x] Opening stock entry (manual + CSV import). Adjustments. Warehouse CRUD.
- [x] Derived available/reserved balances; negative-stock guard with row locking.

---

## ✅ Sprint 6 — Production (milling)
**Status: DONE**

- [x] `production_batch` + `production_input` + `production_output`.
- [x] Consuming inputs writes `production_out` inventory txns; outputs write `production_in` txns.
- [x] Cost pool allocated across outputs by value / by weight / manual. Waste + yield tracking.

---

## ✅ Sprint 7 — Orders, reservation & dispatch
**Status: DONE**

- [x] Order lifecycle state machine (draft → confirmed → reserved → dispatched → completed).
- [x] Price resolution + snapshot onto lines; min-price + credit-limit override flags.
- [x] Confirm → reserve via inventory engine. Cancel → release. Partial dispatch. Order timeline.

---

## ✅ Sprint 8 — Invoices, Payments & Ledgers
**Status: DONE**

- [x] Invoice generation from orders. Optional GST: org default rate + per-invoice override.
- [x] Payments (all methods) + payment↔invoice allocation (many-to-many). Advance/available credit.
- [x] Customer & supplier ledgers; derived outstanding balances (never stored as mutable column).

---

## ✅ Sprint 9 — Reports & Dashboard
**Status: DONE**

- [x] KPIs: sales today/month, outstanding, inventory value, low stock, top customers, pending dispatch.
- [x] Owner dashboard + operator dashboard. Global search across core entities. Reports page.

---

## ✅ Post-MVP — Email & Client Onboarding
**Status: DONE** (2026-07-06)

- [x] Gmail SMTP via nodemailer (`GMAIL_USER` + `GMAIL_APP_PASSWORD`) — no custom domain needed.
- [x] Invitation email template (HTML) sent when admin onboards a client.
- [x] Email verification template sent on sign-up.
- [x] Admin onboarding form: email-only (org named "New Business" as placeholder; client renames in Settings).
- [x] `/accept-invitation` page: shows org/inviter info; "Sign in to accept" or "Create account to accept".
- [x] Invitation acceptance flow: sign-in auto-redirects invited users to sign-up; sign-up bypasses
      invite-only gate when `callbackURL` contains `accept-invitation`.
- [x] Platform admin emails hidden from user list in admin panel.
- [x] Org slug removed from client-facing Settings form.

---

## After MVP (do NOT build now)
WhatsApp integration, notifications, customer portal, mobile app, barcode/QR, expenses,
multi-warehouse UI, FIFO/joint-cost accounting, full tax/GST engine, AI features.
