# AgriFlow

A multi-tenant B2B SaaS operations platform for agricultural businesses. Built for a rice mill in Pakistan — replacing WhatsApp, paper registers, and Excel with one system for procurement, inventory, production, orders, payments, and customer ledgers.

## What it does

- **Procurement** — purchase paddy from farmers/traders, track supplier ledgers
- **Inventory** — event-sourced stock ledger across multiple warehouses; opening stock, purchases, adjustments, transfers; stock never goes negative
- **Production (Milling)** — consume paddy inputs, produce rice outputs + by-products; cost allocation by value, weight, or manual
- **Orders** — full order lifecycle (draft → confirmed → reserved → dispatched → completed); price snapshots, credit limit enforcement
- **Invoices & Payments** — invoice generation, optional GST/tax, payment recording, many-to-many payment allocation; customer outstanding balance derived from ledger (never stored)
- **Reports** — monthly sales, payments, inventory snapshot
- **Settings** — org profile, member management, role-based invitations
- **Platform Admin** — `/admin` area to onboard and monitor merchant organizations

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| UI | Tailwind CSS v4 + shadcn/ui (base-ui) |
| Database | PostgreSQL on Neon (serverless) |
| ORM | Drizzle ORM + drizzle-kit migrations |
| Auth | Better Auth v1.6 with organization plugin |
| Validation | Zod + React Hook Form |
| Hosting | Vercel |

## Getting started

### Prerequisites
- Node.js 20+
- A [Neon](https://neon.tech) database
- A [Vercel](https://vercel.com) account (for deployment)

### Local setup

```bash
# 1. Clone and install
git clone https://github.com/mohammadali83123/agriflow.git
cd agriflow
npm install

# 2. Set environment variables
cp .env.example .env.local
# Fill in DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL, PLATFORM_ADMIN_EMAILS

# 3. Run migrations
npm run db:migrate

# 4. Seed with realistic rice mill data (optional)
node --env-file=.env.local scripts/seed.mjs

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Random secret for session signing (32+ chars) |
| `BETTER_AUTH_URL` | Full URL of the app (e.g. `http://localhost:3000`) |
| `PLATFORM_ADMIN_EMAILS` | Comma-separated emails that can access `/admin` |

## Scripts

```bash
npm run dev          # Start local dev server
npm run build        # Production build
npm run typecheck    # TypeScript check (must pass before push)
npm run lint         # ESLint
npm run db:generate  # Generate Drizzle migration from schema changes
npm run db:migrate   # Apply pending migrations
npm run db:studio    # Open Drizzle Studio (DB browser)

# Seed / reseed the database
node --env-file=.env.local scripts/seed.mjs           # First-time seed
node --env-file=.env.local scripts/seed.mjs --force   # Wipe and reseed
```

## Project structure

```
src/
  app/
    (auth)/          # Sign-in, sign-up, onboarding, org selector
    (app)/           # Authenticated app (dashboard, orders, inventory, …)
    admin/           # Platform admin area (gated by PLATFORM_ADMIN_EMAILS)
    api/             # Route handlers (Better Auth)
  components/
    ui/              # shadcn/base-ui primitives
    layout/          # Sidebar, nav, mobile header
    <feature>/       # Feature-specific components
  lib/
    auth.ts          # Better Auth server config
    auth-client.ts   # Better Auth browser client
    db/
      index.ts       # Drizzle client
      schema/        # One file per domain
      scoped.ts      # requireOrg() — all queries go through here
    rbac.ts          # Role definitions and can() helper
    money.ts         # paisa ↔ rupee formatting
    units.ts         # Base unit ↔ packaging conversion
    i18n.ts          # UI string catalog (English first, Urdu-ready)
  server/
    <feature>/
      actions.ts     # Server Actions per domain
    inventory/
      engine.ts      # Only writer of inventory_transaction rows
    production/
      engine.ts      # Milling: consume inputs → produce outputs
    ledger/
      engine.ts      # Invoice/payment allocation + balance derivation
```

## Key design rules

1. **Every table has `org_id`.** All queries go through `requireOrg()` in `lib/db/scoped.ts` — never write org-unfiltered queries in feature code.
2. **Money is stored as integer paisa (BIGINT).** Never floats. Fields named `*_minor` are paisa.
3. **Inventory is event-sourced.** Never mutate stock directly — always insert an `inventory_transaction` row.
4. **Order line prices are snapshots.** Copied at creation; later price changes don't affect past orders.
5. **Balances are derived, not stored.** Customer outstanding = SUM(invoices) − SUM(allocations).
6. **Soft-delete only.** Use `deleted_at`; operators can never hard-delete.

## Roles

| Role | Access |
|---|---|
| **Owner** | Full access — all modules, settings, reports, price overrides |
| **Member** (Operator) | Inventory, orders, payments, production — no settings or reports |
