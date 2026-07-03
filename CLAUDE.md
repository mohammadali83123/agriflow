# CLAUDE.md — AgriFlow

> This file is the operating manual for building AgriFlow. Read it fully before writing code.
> Detailed specs live in `docs/`. This file holds the rules you must never break.

---

## What we're building

AgriFlow is a multi-tenant B2B SaaS operations platform for agricultural businesses. The
first customer is a rice mill in Pakistan that sells grain in bulk (no retail storefront).
It replaces WhatsApp + paper registers + Excel with one system for procurement, inventory,
orders, dispatch, payments, and customer/supplier ledgers.

Think Linear/Stripe/Shopify in feel — clean, fast, minimal, mobile-friendly. **Not** a
traditional dense ERP.

Full product spec: `docs/PRD.md`. Architecture: `docs/ARCHITECTURE.md`. Schema:
`docs/DATA_MODEL.md`. Build order: `docs/SPRINTS.md`. Decisions & open questions:
`docs/DECISIONS.md`. UI system: `docs/UI.md`.

---

## GOLDEN RULES (never violate)

1. **Every table has `org_id`. Every query is scoped to the active org.** Data access goes
   through a shared scoped layer (`lib/db/scoped.ts`) that injects `org_id` from the
   session — never write raw org-unfiltered queries in feature code. This is the #1 way
   multi-tenant apps leak data. Also enable Postgres Row-Level Security as defense in depth.

2. **Money is stored as integer minor units (paisa) in `BIGINT`.** Never floats for money.
   A field named `*_minor` means paisa. Format to rupees only at the display edge.

3. **Quantities use Postgres `numeric` (exact decimal), never float.** Store in a product's
   base unit. Packaging (bag/maund/ton) is a conversion layer on top — see ARCHITECTURE.

4. **Inventory is event-sourced. Never mutate a stock quantity directly.** Every change
   (purchase, production, sale, reserve, dispatch, transfer, adjustment) inserts an
   `inventory_transaction` row. Current stock is always `SUM(quantity_delta)` over
   transactions. Stock must never go negative (validate before insert).

5. **Order line prices are snapshots.** When an order line is created, copy the resolved
   unit price onto the line. Later price changes must not alter past orders.

6. **Financial state is derived from ledgers, not stored as a mutable number.** Customer
   outstanding balance = SUM(invoice charges) − SUM(payment allocations). Don't keep a
   hand-updated `balance` column as source of truth.

7. **Soft-delete, don't hard-delete.** Use `deleted_at`. Operators can't delete at all.

8. **Validate on the server with Zod.** Every Server Action / Route Handler re-validates
   input regardless of client validation. Never trust the client.

9. **Don't overengineer.** Build the vertical slice the current sprint needs, ship it,
   move on. No speculative abstractions. Defer anything marked "future" in the PRD.

10. **Localization-ready + role-based UI.** Every user-facing string goes through the central
    catalog (`lib/i18n.ts`) — never hardcode display text. Ship English first; Urdu is added
    later without a refactor. Operators get a simplified, task-first UI; owners get the full
    interface. See `docs/UI.md`.

---

## Tech stack (all free-tier)

- **Framework:** Next.js (App Router, latest stable) + TypeScript (strict)
- **UI:** Tailwind CSS + shadcn/ui. See `docs/UI.md` for the design system.
- **DB:** PostgreSQL on Neon (free tier). **ORM:** Drizzle. Migrations via `drizzle-kit`.
- **Auth + multi-tenancy:** Better Auth with the `organization` plugin (orgs, members,
  invitations, roles/RBAC). Run `npx @better-auth/cli generate` to emit its schema.
- **Backend:** Next.js Server Actions for mutations, Route Handlers for anything external.
- **Validation:** Zod. **Forms:** React Hook Form.
- **Hosting:** Vercel (Hobby while building; see DECISIONS.md for the commercial caveat).

Do not add libraries not listed here without recording why in `docs/DECISIONS.md`.

---

## Project structure (target)

```
src/
  app/                     # Next.js App Router
    (auth)/                # sign-in, sign-up, accept-invite
    (app)/                 # authenticated app, wrapped by org guard
      dashboard/
      products/
      customers/
      suppliers/
      inventory/
      orders/
      payments/
      settings/
    api/                   # Route Handlers (auth, webhooks later)
  components/
    ui/                    # shadcn primitives
    <feature>/             # feature-specific components
  lib/
    auth.ts                # Better Auth server config
    auth-client.ts         # Better Auth client
    db/
      index.ts             # Drizzle client
      schema/              # one file per domain (products.ts, orders.ts, ...)
      scoped.ts            # org-scoped query helpers  <-- ALL feature reads/writes go here
    validations/           # Zod schemas per domain
    money.ts               # paisa <-> rupee helpers
    units.ts               # base-unit <-> packaging conversion
    i18n.ts                # central UI string catalog (English first, Urdu later)
    import/               # reusable CSV import pipeline (map -> validate -> preview -> commit)
  server/
    <feature>/actions.ts   # Server Actions per domain
    inventory/engine.ts    # the inventory transaction engine (only writer of stock)
    production/engine.ts   # milling: consume inputs -> allocate cost -> produce outputs
    ledger/engine.ts       # invoice/payment allocation + balance derivation
docs/
```

---

## Commands

- `npm run dev` — local dev
- `npm run build` — production build (must pass before every push)
- `npm run lint` / `npm run typecheck` — must pass before commit
- `npm run db:generate` — generate Drizzle migration from schema changes
- `npm run db:migrate` — apply migrations
- `npm run db:studio` — inspect DB

Add these scripts to `package.json` during Sprint 0.

---

## Git workflow (follow this rhythm)

Work in small vertical slices. After each logical unit that builds and typechecks:

```
git add -A
git commit -m "<type>(<scope>): <what changed>"
git push
```

Use Conventional Commits: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.
Examples: `feat(products): add product create form`, `fix(inventory): prevent negative stock on sale`.

Rules:
- One concern per commit. Commit when it builds, not "at the end of the day."
- Never commit secrets. `.env` is gitignored; only `.env.example` is tracked.
- `npm run build && npm run typecheck` must pass before you push.
- Prefer many small honest commits over few large ones.

---

## How to work with me (the human)

- I do product decisions, testing, and validation with the real rice mill. I don't hand-write code.
- Before building a sprint, restate the plan and the schema you'll create, and flag any
  decision in `docs/DECISIONS.md` marked "CONFIRM" that this sprint depends on.
- After building, tell me exactly what to test and what "done" looks like.
- If a requirement is ambiguous, check `docs/DECISIONS.md` first; if still unclear, ask —
  don't guess on anything touching money, inventory quantities, or tenancy.
