# Security Reference — AgriFlow

> Multi-tenant SaaS handles money and business data. Security is not optional.
> This doc records what is in place, what every new feature must do, and what is deferred.

---

## Threat model (brief)

| Threat | Mitigation |
|---|---|
| Tenant data leak (cross-org query) | `requireOrg()` + RLS on every table |
| Session hijack | Better Auth secure cookies + HTTPS-only in prod |
| Clickjacking | `X-Frame-Options: DENY` header |
| MIME sniffing | `X-Content-Type-Options: nosniff` header |
| Brute-force login | Better Auth built-in rate limiting (verify config) |
| CSRF on Server Actions | Next.js origin check (built-in for Server Actions) |
| Money corruption | Integer paisa, never floats, Zod-validated on server |
| Inventory manipulation | Event-sourced, insert-only, stock never goes negative |
| Privilege escalation | `can(role, permission)` checked server-side before every mutation |

---

## What is in place

### 1. HTTP security headers (`next.config.ts`)

Applied to every route via `async headers()`:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Blocks clickjacking iframes |
| `X-Content-Type-Options` | `nosniff` | Stops MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unneeded browser APIs |
| `X-DNS-Prefetch-Control` | `on` | Minor perf + tracking hygiene |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS (production only) |

CSP is not yet set. Add it in a later sprint once the full set of third-party origins
is known (Vercel Analytics, any future payment gateway, etc.).

### 2. Authentication (`src/proxy.ts` + `src/lib/auth.ts`)

- **Edge layer (`proxy.ts`):** Cookie presence check only — fast redirect for unauthenticated
  browsers. Not authoritative. A forged cookie with any value bypasses this redirect, which
  is acceptable because the server-side check is the real gate.
- **Server layer (`requireAuth()` / `requireOrg()`):** Authoritative. Calls `auth.api.getSession()`
  which validates the session signature against the DB. All authenticated routes go through this.

### 3. Multi-tenancy (`src/lib/db/scoped.ts`)

`requireOrg()` returns `{ orgId, role, db }`. Feature code must:

```typescript
// ✓ correct — orgId always scopes the query
const { orgId } = await requireOrg();
const products = await db.select().from(schema.product).where(eq(schema.product.orgId, orgId));

// ✗ wrong — leaks all orgs' data
const products = await db.select().from(schema.product);
```

Every business table has an `org_id` column. Every query filters by it.

### 4. Postgres Row-Level Security (pending)

RLS policies will be added as soon as the first business table is created (Sprint 3).
The policy template:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (migrations, server-to-server)
-- App role enforces it
CREATE POLICY "tenant_isolation" ON <table>
  USING (org_id = current_setting('app.org_id')::uuid);
```

The `app.org_id` setting must be injected at connection time via the Drizzle client.
See `ARCHITECTURE.md` for the planned implementation.

### 5. Input validation (`lib/validations/`)

Every Server Action and Route Handler must re-validate with Zod before touching the DB:

```typescript
// ✓ correct
const parsed = productSchema.safeParse(input);
if (!parsed.success) return { error: parsed.error.flatten() };
// use parsed.data only

// ✗ wrong — trusting the client
await db.insert(schema.product).values(input);
```

Client-side validation (React Hook Form + Zod) is UX only, never the gate.

### 6. Money integrity

- Stored as `BIGINT` in paisa (integer minor units). Column names end in `_minor`.
- Never accept a float from the client for a monetary field.
- Zod schema for money fields: `z.number().int().nonnegative()`
- Display helper: `src/lib/money.ts` — converts paisa ↔ rupee string at the edge only.

### 7. Role-based access control (`src/lib/rbac.ts`)

`can(role, permission)` must be called server-side before any write mutation:

```typescript
const { role } = await requireOrg();
if (!can(role, "products:write")) {
  throw new Error("Forbidden");  // or return { error: "Forbidden" }
}
```

Never rely on the client hiding a button as the only authorization check.

---

## Rules every new feature must follow

1. **Every Server Action starts with `requireOrg()`** — gets `orgId` and `role`.
2. **Every DB write checks `can(role, permission)`** before executing.
3. **Every insert/update is scoped by `orgId`** — no naked table writes.
4. **Every input is Zod-parsed** before hitting the DB — reject unknowns with `.strict()`.
5. **Money fields are integer paisa** — Zod schema: `z.number().int().nonnegative()`.
6. **Inventory changes go through `server/inventory/engine.ts`** — never raw SQL delta updates.
7. **Soft-delete only** — `deleted_at = now()`, never `DELETE FROM`.
8. **No secrets in code** — `.env.local` only; `.env.example` tracks the shape, not values.

---

## What is intentionally deferred

| Item | When | Reason |
|---|---|---|
| Content Security Policy | Sprint 5+ | Need full third-party origin list first |
| Postgres RLS policies | Sprint 3 | No business tables yet |
| Rate limiting on auth | Sprint 4 | Better Auth has basic protection; add middleware when needed |
| Audit log | Sprint 6+ | PRD marks as future |
| 2FA / passkeys | Future | PRD defers; Better Auth supports it when needed |
| Invite expiry enforcement | Sprint 4 | Once invitation flow is built |

---

## Dependency security

- Run `npm audit` before each sprint and resolve `high` or `critical` findings.
- Do not add new dependencies without recording them in `docs/DECISIONS.md`.
- Vercel preview deployments share the same DB. Never run destructive seeds on preview.

---

## Environment variables

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | `.env.local` + Vercel | Neon connection string; includes credentials |
| `BETTER_AUTH_SECRET` | `.env.local` + Vercel | Session signing key; rotate if leaked |
| `BETTER_AUTH_URL` | `.env.local` + Vercel | Must match the deployed origin |
| `NEXT_PUBLIC_APP_URL` | `.env.local` + Vercel | Auth client base URL |

`.env.local` is gitignored. Only `.env.example` (no values) is tracked.
Vercel env vars are set in the dashboard, not in code.
