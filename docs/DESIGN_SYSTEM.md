# Design System — AgriFlow

> This file is the visual law. Every page and component must follow these rules.
> Pakistan market: operators use phones in mills and warehouses. Every screen must
> feel professional, readable at arm's length, and fast to navigate.

---

## Brand

**Logo:** Lucide `Wheat` icon in a rounded square container with the primary green background.
```tsx
<div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
  <Wheat className="size-4" />
</div>
```

**Wordmark:** `AgriFlow` — `font-bold text-sm tracking-tight`

**Colors:**
- Primary: `oklch(0.551 0.177 149.4)` — deep agricultural green
- Used for: buttons, active nav items, icon badges, links, focus rings
- On primary: always white text (`oklch(0.985 0 0)`)

**Never** use the primary green as a background on large content areas — it's for interactive
elements and badges only. The sidebar has a subtle tinted background, not full green.

---

## Color palette (CSS variables — all defined in globals.css)

| Role | Variable | Usage |
|---|---|---|
| Primary | `--primary` | Buttons, active states, badges, links |
| Background | `--background` | Page background (very slightly warm off-white) |
| Card | `--card` | Card surfaces (pure white) |
| Muted | `--muted` | Hover backgrounds, section fills |
| Muted-fg | `--muted-foreground` | Labels, metadata, placeholder text |
| Border | `--border` | Card and section borders |
| Sidebar | `--sidebar` | Sidebar background (slightly green-tinted) |
| Destructive | `--destructive` | Errors, delete actions |

### Semantic accent colors (use Tailwind direct classes, not variables)

| Meaning | Color | Usage |
|---|---|---|
| Positive / Sales | `emerald-500/600` + `emerald-50` bg | Revenue, completed, stock gain |
| Warning / Debt | `amber-500/600` + `amber-50` bg | Outstanding balances, low stock |
| Info / Inventory | `blue-500/600` + `blue-50` bg | Inventory, items, quantity |
| Action / Dispatch | `orange-500/600` + `orange-50` bg | Pending dispatch, production |
| Error | `destructive` (CSS var) | Errors, negative stock, failed |

```tsx
// Example: a colored icon badge
<span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
  <TrendingUp className="size-3.5" />
</span>
```

---

## Typography

| Element | Classes |
|---|---|
| Page title | `text-2xl font-bold tracking-tight` |
| Section heading | `text-sm font-semibold` |
| Body / table rows | `text-sm` |
| Labels | `text-sm font-medium` |
| Metadata / timestamps | `text-xs text-muted-foreground` |
| Empty state title | `text-sm font-medium text-foreground` |
| Empty state body | `text-sm text-muted-foreground` |

**Money**: always `font-bold` or `font-semibold`. Format: `Rs 1,25,000` (South Asian grouping via `formatRupees()`).
**Quantities**: always show unit: `980 kg`, `12 bags`.

---

## Layout

### Page wrapper
Every app page uses:
```tsx
<div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
  {/* Page header */}
  <div className="flex items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
      <p className="text-sm text-muted-foreground mt-0.5">Optional subtitle</p>
    </div>
    <Button asChild><Link href="/page/new">New item</Link></Button>
  </div>
  {/* Page content */}
</div>
```

### Back navigation
```tsx
<Link href="/parent" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 group">
  <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
  Parent page
</Link>
```

---

## Cards

Standard card: `rounded-xl border bg-card shadow-sm`

```tsx
<div className="rounded-xl border bg-card shadow-sm">
  <div className="px-5 py-4 border-b">
    <h2 className="text-sm font-semibold">Section title</h2>
  </div>
  <div className="p-5">
    {/* content */}
  </div>
</div>
```

KPI card (with colored left border):
```tsx
<div className="rounded-xl border bg-card p-4 border-l-4 border-l-emerald-500 shadow-sm">
  <div className="flex items-center justify-between mb-3">
    <p className="text-xs font-medium text-muted-foreground">Sales today</p>
    <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
      <TrendingUp className="size-3.5" />
    </span>
  </div>
  <p className="text-xl font-bold tracking-tight">Rs 1,25,000</p>
  <p className="text-xs text-muted-foreground mt-0.5">12 orders</p>
</div>
```

---

## Tables

All data tables follow this pattern — mobile-scrollable, hover rows, correct empty state:

```tsx
<div className="rounded-xl border bg-card shadow-sm overflow-hidden">
  {/* Optional toolbar */}
  <div className="px-4 py-3 border-b flex items-center gap-3">
    <Input placeholder="Search..." className="max-w-xs h-9" />
    <div className="ml-auto">
      <Button variant="outline" size="sm">Filter</Button>
    </div>
  </div>

  {/* Scrollable table */}
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead className="border-b bg-muted/30">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Name
          </th>
          {/* Right-align numeric columns */}
          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Amount
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-muted/30 transition-colors">
            <td className="px-4 py-3 font-medium">{item.name}</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums">
              {formatRupees(item.amountMinor)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Empty state — shown when items.length === 0 */}
  {items.length === 0 && (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
        <Package className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium mb-1">No products yet</p>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        Add your first product to start tracking inventory and pricing.
      </p>
      <Button asChild size="sm">
        <Link href="/products/new">Add product</Link>
      </Button>
    </div>
  )}
</div>
```

**Rules:**
- Always `overflow-x-auto` on the scroll wrapper
- Money columns: `text-right font-mono tabular-nums`
- Header: `text-xs font-semibold text-muted-foreground uppercase tracking-wide`
- Empty state: icon in circle + title + description + CTA

---

## Status badges

```tsx
// Status badge pattern
<span className={cn(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  status === "active" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  status === "inactive" && "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
)}>
  {status === "active" ? "Active" : "Inactive"}
</span>

// Order status
const ORDER_STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  confirmed: "bg-blue-50 text-blue-700",
  reserved: "bg-indigo-50 text-indigo-700",
  ready: "bg-amber-50 text-amber-700",
  dispatched: "bg-orange-50 text-orange-700",
  delivered: "bg-teal-50 text-teal-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};
```

---

## Forms

Forms always use react-hook-form + zodResolver. Layout rules:

```tsx
<form className="space-y-5">
  {/* Error banner */}
  {error && (
    <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-3 py-2.5">
      <p className="text-sm text-destructive">{error}</p>
    </div>
  )}

  {/* Field */}
  <div className="space-y-1.5">
    <Label htmlFor="field">Field label <span className="text-destructive">*</span></Label>
    <Input id="field" {...register("field")} />
    {errors.field && (
      <p className="text-xs text-destructive">{errors.field.message}</p>
    )}
  </div>

  {/* Optional field — no asterisk */}
  <div className="space-y-1.5">
    <Label htmlFor="optional">
      Optional field{" "}
      <span className="text-muted-foreground font-normal">(optional)</span>
    </Label>
    <Input id="optional" {...register("optional")} />
  </div>

  {/* Money input — user types rupees */}
  <div className="space-y-1.5">
    <Label htmlFor="price">Price (Rs per kg)</Label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rs</span>
      <Input id="price" type="number" step="0.01" className="pl-9" {...register("priceRupees")} />
    </div>
  </div>

  {/* Submit */}
  <Button type="submit" className="w-full" disabled={isPending}>
    {isPending ? "Saving…" : "Save"}
  </Button>
</form>
```

**Rules:**
- Required fields: asterisk `*` in destructive color
- Optional fields: `(optional)` text in muted
- Money inputs: `Rs` prefix in a relative wrapper
- Full-width submit button
- Disabled while pending
- Vertical stack on all screen sizes

---

## Action rows (clickable list items)

Pattern used in org picker, quick links, etc.:
```tsx
<Link
  href="/somewhere"
  className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 hover:bg-muted/50 hover:border-primary/30 transition-all shadow-sm group"
>
  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
    <Building2 className="size-4" />
  </span>
  <div className="flex-1 min-w-0">
    <p className="font-semibold text-sm truncate">Title</p>
    <p className="text-xs text-muted-foreground">Subtitle</p>
  </div>
  <ArrowRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
</Link>
```

---

## Auth pages

The `(auth)` layout provides a split screen:
- **Desktop**: Left panel (primary green, brand + feature list) | Right panel (white, form)
- **Mobile**: White background, centered form, small brand at top

Individual auth pages render a `<Card>` with `shadow-sm border-border/60`. No extra wrapper needed.

---

## Spacing system

| Context | Classes |
|---|---|
| Page outer | `p-4 md:p-6` |
| Card inner | `p-5` |
| Card header | `px-5 py-4` |
| Table cell | `px-4 py-3` |
| Between sections | `space-y-6` |
| Between form fields | `space-y-5` (form), `space-y-1.5` (label+input) |
| Between list items | `space-y-2` |

---

## Interactive states

- **Hover**: `hover:bg-muted/50` (list rows), `hover:bg-muted` (nav), `hover:bg-muted/30` (table rows)
- **Active/selected**: `bg-primary text-primary-foreground` (nav items)
- **Focus**: default ring from CSS variables (green ring, set in globals.css)
- **Disabled**: `disabled:opacity-60 disabled:cursor-not-allowed`
- **Loading**: show "Saving…" or "Loading…" text on buttons; keep layout stable (no spinner that shifts content)

---

## Icons

- Source: `lucide-react` (already installed)
- Size in buttons: `size-4`
- Size in table cells / labels: `size-4`
- Size in icon badges: `size-3.5` (in small badge) or `size-5` (in large badge)
- Size in empty states: `size-5`
- Icons in nav must be resolved from `ICON_MAP` in `sidebar-nav.tsx` — never pass LucideIcon as a prop across RSC boundary

---

## What NOT to do

- No dense ERP grids — progressive disclosure
- No truncated numbers — always show full money amount
- No placeholder text as the only label — always use `<Label>`
- No color-only status indicators — always pair with text
- No `p-6` on mobile — always `p-4 md:p-6`
- No raw `<table>` without `overflow-x-auto` wrapper
- No hardcoded strings — use `t(key)` from `lib/i18n.ts`
- No hard-coded `balance` columns — derive from ledger
