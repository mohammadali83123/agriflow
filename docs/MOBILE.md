# Mobile-First Patterns — AgriFlow

> AgriFlow targets field operators who use phones. Every screen must work on a 375px
> wide device before it's considered done. Desktop is an enhancement, not the baseline.

---

## Layout system

The app shell uses a **two-breakpoint layout**:

| Breakpoint | Layout |
|---|---|
| `< md` (< 768px) | Vertical column: top-bar → scrollable main |
| `≥ md` (≥ 768px) | Horizontal row: sticky sidebar → scrollable main |

### App shell structure

```
<div class="flex h-screen overflow-hidden">          ← root: horizontal flex
  <aside class="hidden md:flex w-60 ...">             ← desktop sidebar
  <div class="flex flex-1 flex-col min-h-0 ...">      ← mobile column wrapper
    <MobileNav />                                      ← <header md:hidden shrink-0 h-14>
    <main class="flex-1 overflow-y-auto">              ← scrolls, takes remaining height
      {page content}
    </main>
  </div>
</div>
```

**Rule:** The mobile top-bar must always be `shrink-0` inside the flex column — never
`sticky` (it doesn't scroll because `main` is the scroll container, not the body).

---

## Responsive spacing

Always use mobile-first padding. Start small, open up on `md`:

```tsx
// ✓ correct
<div className="p-4 md:p-6">

// ✗ wrong — too tight on phones
<div className="p-6">
```

Standard scale:
- Page wrapper: `p-4 md:p-6`
- Card interior: `p-4 md:p-5`
- Section gap: `space-y-4 md:space-y-6`

---

## Grids

Start single-column on mobile; expand at `sm` or `md`:

```tsx
// KPI cards — 2 per row on mobile, 4 on sm+
<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

// Action cards — 1 per row on mobile, 2 on sm+
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

// Data tables — horizontal scroll on mobile
<div className="overflow-x-auto">
  <table className="min-w-full">
```

---

## Typography

Keep text readable at small sizes. Minimum body text is `text-sm` (14px). Never use
`text-xs` for primary content — only for metadata, labels, and secondary info.

---

## Touch targets

All tappable elements must be at least 44×44px per Apple/Google HIG:

```tsx
// ✓ button with explicit minimum
<button className="flex items-center justify-center size-11 ...">

// ✓ nav links have py-2 px-3 which usually reaches 44px with text
<Link className="flex items-center gap-3 rounded-md px-3 py-2 text-sm ...">

// ✗ bare icon with no padding — too small
<button><Icon className="size-4" /></button>
```

---

## iOS-specific

### Safe areas (notch / home indicator)

Use the `pb-safe` / `pt-safe` utilities defined in `globals.css`:

```tsx
// Bottom of mobile drawer
<div className="px-3 py-3 pb-safe">

// Full-screen overlays
<div className="min-h-screen pt-safe">
```

These utilities expand to `env(safe-area-inset-bottom, 0px)` and fall back to 0 on
non-notched devices.

### Tap highlight

All `<button>` and `<a>` elements have `-webkit-tap-highlight-color: transparent` set
globally in `globals.css`. Do not add custom tap highlight color unless UX requires it.

### Input zoom prevention

iOS Safari zooms in on form inputs with `font-size < 16px`. Our `Input` component uses
`text-sm` (14px). To prevent zoom, we rely on the `maximum-scale=1` viewport setting
in `app/layout.tsx`. **Do not remove this.**

Wait — actually we removed `maximumScale` to preserve accessibility. Instead, set
`font-size: 16px` on inputs on mobile via a Tailwind variant if zoom becomes an issue:

```tsx
<Input className="text-base md:text-sm" />
```

---

## Forms

- Labels always visible (never placeholder-only)
- Inputs stacked vertically on mobile; never side-by-side below `md`
- Submit button full-width: `w-full`
- Error messages inline, below the relevant field — not toast-only

```tsx
// Standard field layout
<div className="space-y-1.5">
  <Label htmlFor="field">Field label</Label>
  <Input id="field" ... />
  {error && <p className="text-xs text-destructive">{error}</p>}
</div>
```

---

## Tables on mobile

Never let a data table overflow the viewport silently. Always wrap in `overflow-x-auto`:

```tsx
<div className="overflow-x-auto rounded-lg border">
  <table className="min-w-[600px] w-full text-sm">
    ...
  </table>
</div>
```

For key screens (Orders, Inventory), consider a **card list** layout on mobile that
switches to a table on `md+`:

```tsx
{/* Mobile: card list */}
<div className="md:hidden space-y-2">
  {items.map(item => <OrderCard key={item.id} order={item} />)}
</div>
{/* Desktop: table */}
<div className="hidden md:block overflow-x-auto">
  <OrderTable items={items} />
</div>
```

---

## Modal / Sheet

Use `bottom sheet` pattern on mobile (slides from bottom) rather than centered modals.
With base-ui, use a `Dialog` with responsive positioning:

```tsx
// The dialog content: full-width at bottom on mobile, centered on desktop
<DialogContent className="
  fixed bottom-0 left-0 right-0 rounded-t-2xl pb-safe
  md:inset-auto md:relative md:rounded-xl md:max-w-md
">
```

---

## Checklist for every new page

- [ ] Renders usably at 375px width (iPhone SE)
- [ ] Touch targets ≥ 44px
- [ ] `p-4 md:p-6` wrapper padding
- [ ] Tables wrapped in `overflow-x-auto`
- [ ] Forms stacked vertically
- [ ] No content hidden behind mobile nav bar (top 56px = h-14)
- [ ] `pb-safe` on any element that touches the bottom edge on mobile
