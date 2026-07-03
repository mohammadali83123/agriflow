# Decisions & Open Questions

Two sections: (A) decisions already made — treat as settled unless the human overrides;
(B) minor assumptions the human can override anytime. Items that affect the schema or money
math are called out; confirm them before the sprint that depends on them.

> Updated after the human's answers: products are fully dynamic; tax is optional; CSV import
> is in scope alongside manual entry; the mill both mills paddy AND trades bought goods, so
> **Production is now IN the MVP** (simple version).

---

## A. Settled decisions

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

---

## B. Minor assumptions (override anytime — safe defaults)

1. **Warehouses:** single-warehouse UI for MVP, schema multi-warehouse-ready. Change if the
   mill already operates multiple storage sites.
2. **Invoice/order numbering:** `<prefix>-<year>-<sequential>` unless a legal/tax format is required.
3. **Production cost allocation default:** by relative output value (best for joint products),
   with by-weight and manual per-output overrides available.

---

## C. Change log
- Record any new library added, or any decision changed, here with a one-line reason and date.
- <date>: Production moved into MVP; tax made optional; CSV import added; localization + role-based
  UI complexity added — per customer answers.
