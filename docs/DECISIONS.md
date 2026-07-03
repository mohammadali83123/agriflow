# Decisions & Open Questions

Two sections: (A) decisions already made — treat as settled unless the human overrides;
(B) minor assumptions the human can override anytime. Items that affect the schema or money
math are called out; confirm them before the sprint that depends on them.

> Updated after the human's answers: products are fully dynamic; tax is optional; CSV import
> is in scope alongside manual entry; the mill both mills paddy AND trades bought goods, so
> **Production is now IN the MVP** (simple version).

---

## A. Settled decisions

### Product & data model
1. **One GitHub repo, single Next.js app.** No monorepo/Turborepo for MVP.
2. **Money = integer paisa in BIGINT (`*_minor`).** Currency fixed to PKR for v1.
3. **Quantities = `numeric(14,3)` in a per-product base unit; packaging is a conversion layer.**
4. **Products are fully dynamic.** Each product defines its OWN base unit, packaging options,
   variants, and custom fields — different products can differ completely (rice in kg/bags,
   something else in liters/pieces, etc.). Prices are expressed in whatever unit suits that
   product and stored resolved to base units.
5. **Inventory is event-sourced** (append-only transactions; stock derived). No mutable qty column.
6. **Cost basis = weighted average** per product/warehouse. FIFO/specific-batch deferred.
7. **Order line prices are snapshots**, resolved as customer price → daily price → base price.
8. **Multi-tenancy = shared DB + `org_id` everywhere + scoped data layer + Postgres RLS.**
9. **RBAC via Better Auth organization plugin** (owner/operator for MVP; custom roles later).
   Roles in code: `"owner"` and `"member"` (Better Auth default); displayed as "Owner"/"Operator".
10. **Soft deletes**; operators cannot delete.
11. **Production is IN the MVP (simple version).** The mill both mills paddy into rice AND
    resells bought goods. A production batch consumes input stock and yields multiple outputs
    (rice, broken, bran, husk, polish) + waste. Cost allocation is simple (by value / by
    weight / manual) — full joint-cost accounting is future. See ARCHITECTURE §11.
12. **Tax is OPTIONAL, owner-controlled.** No forced GST engine. The org can set a default tax
    rate; each invoice can turn tax on/off and override the rate. No input-tax credit logic in
    MVP. See ARCHITECTURE §7a.
13. **Bulk data entry = manual AND CSV import.** A reusable import pipeline (upload → map
    columns → validate → preview → commit) covers products, customers, suppliers, opening
    stock, and opening balances. Manual single-record entry also exists. See ARCHITECTURE §10.
14. **Reservation:** only a *confirmed* order reserves stock; drafts don't. No expiry in MVP.
    Cancel releases reservations.
15. **Localization-ready + role-based UI complexity.** Centralize all UI strings from day 1
    (English first, Urdu addable cheaply). Operators get a simplified, task-first UI; owners
    get full dashboards. See UI.md.
16. **Hosting:** build/validate on Vercel Hobby. Vercel Hobby is non-commercial only, so for
    real production move to Vercel Pro (~$20/mo) OR self-host (spare laptop / Oracle Always-Free
    VM) behind Cloudflare Tunnel. Keep the database on Neon (managed, backed up) regardless.
17. **Auth:** email + password for MVP. Social login / SSO deferred.

### Infrastructure & tooling (resolved during Sprint 0–2)
18. **`.npmrc` sets `legacy-peer-deps=true` globally.** Required because `better-auth` brings in
    `@babel/core@8.x` (RC) while shadcn's transitive deps require `@babel/core@7.x`. Vercel
    also needs this flag to install successfully.
19. **`drizzle-orm` is pinned to `^0.45.2`.** `better-auth@1.6.23` has a peer dep on this
    exact minor version. Do not downgrade.
20. **Better Auth CLI (`@better-auth/cli generate`) is not used.** It can't resolve `@/` path
    aliases outside the Next.js compilation context. Auth tables are hand-maintained in
    `src/lib/db/schema/auth.ts`. When upgrading better-auth, check the changelog for schema
    changes and update manually.
21. **`drizzle.config.ts` explicitly calls `config({ path: ".env.local" })` from the `dotenv`
    package.** `drizzle-kit` does not auto-load `.env.local` — without this, `DATABASE_URL`
    is `undefined` at migrate time.
22. **`src/proxy.ts` (not `middleware.ts`).** Next.js 16 renamed the middleware file;
    the export must also be named `proxy` (not `middleware`). The proxy does only a fast
    cookie-presence check; authoritative session validation happens in `requireOrg()`.

### Security (resolved during Sprint 2)
23. **HTTP security headers are set in `next.config.ts`** via `async headers()`, applied to all
    routes. HSTS is production-only (local dev is HTTP). CSP is deferred until the full
    third-party origin list is known.
24. **Mobile-first layout is non-negotiable** from Sprint 1 onward. `docs/MOBILE.md` is the
    reference. The checklist there applies to every new page and component.

### UI component constraints (resolved during Sprint 2)
25. **shadcn/ui v4 uses `@base-ui/react`, NOT Radix UI.** Component APIs differ:
    - `DropdownMenuLabel` must be wrapped in `DropdownMenuGroup` or it crashes.
    - Do not add the `render` prop to `DropdownMenuTrigger` — use className directly.
    - When adding new shadcn components, verify they work with base-ui before shipping.
26. **Lucide icon components cannot cross the server→client boundary.** Pass `iconName: string`
    across RSC boundaries; resolve to the actual component in an `ICON_MAP` inside the client
    component. This pattern is established in `nav-config.ts` + `sidebar-nav.tsx` and must be
    used for any future nav or config that holds icons.

---

## B. Minor assumptions (override anytime — safe defaults)

1. **Warehouses:** single-warehouse UI for MVP, schema multi-warehouse-ready. Change if the
   mill already operates multiple storage sites.
2. **Invoice/order numbering:** `<prefix>-<year>-<sequential>` unless a legal/tax format is required.
3. **Production cost allocation default:** by relative output value (best for joint products),
   with by-weight and manual per-output overrides available.
4. **Org slug collision:** random 4-char alphanumeric suffix appended on onboarding
   (e.g. `al-noor-rice-mill-k7x2`). Slugs are globally unique in Better Auth.
5. **Session active-org resolution:** on every sign-in, `databaseHooks.session.create.before`
   queries member table: 0 memberships → `null`, 1 membership → auto-select, 2+ → `null`
   (user sees org picker). Acceptable N+1 on sign-in; cache if it becomes a problem.

---

## C. Change log

| Date | Change |
|---|---|
| Sprint 0 | Production moved into MVP; tax made optional; CSV import added; localization + role-based UI added — per customer answers |
| Sprint 0 | Added `legacy-peer-deps=true` to `.npmrc` to resolve @babel/core conflict |
| Sprint 0 | Pinned `drizzle-orm ^0.45.2` for better-auth peer dep |
| Sprint 0 | Added explicit dotenv load in `drizzle.config.ts` |
| Sprint 1 | Auth schema hand-written (Better Auth CLI can't resolve `@/` aliases) |
| Sprint 1 | Added `databaseHooks.session.create.before` for active-org auto-resolution on sign-in |
| Sprint 1 | `middleware.ts` → `proxy.ts` (Next.js 16 rename); export `middleware` → `proxy` |
| Sprint 2 | Nav items use `iconName: string` instead of `LucideIcon` (RSC serialization rule) |
| Sprint 2 | Fixed mobile layout: wrapped MobileNav + main in `flex-col` column |
| Sprint 2 | Added HTTP security headers to `next.config.ts` |
| Sprint 2 | Added `docs/MOBILE.md`, `docs/SECURITY.md` |
