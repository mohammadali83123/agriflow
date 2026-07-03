# UI System & the v0 / Lovable workflow

## Design direction
Feel: Linear / Stripe / Notion — calm, fast, minimal, confident. Not a dense ERP.

Principles:
- **Search-first & keyboard-friendly.** Global search reachable with `/` or `⌘K`.
- **Progressive disclosure.** Show the common path; hide advanced options behind "more".
- **Mobile-first.** The owner will use this on a phone. Every screen works at 375px wide.
- **Minimal clicks.** Creating an order or logging a payment should be fast.
- **Real empty/loading/error states** for every list and form — this is what makes it feel finished.
- **Numbers are first-class.** Right-align money, show currency, format paisa → "Rs 1,250".

Tokens & components:
- Use shadcn/ui primitives; don't hand-roll components that shadcn already provides.
- One neutral base + one accent color. Generous whitespace. System font stack is fine.
- Tables: sticky header, row hover, quick filters, empty state with a primary action.
- Forms: React Hook Form + Zod; inline field errors; disabled submit while pending.

## Designing for mixed literacy (Pakistan market)

Users range from the educated owner to operators who may have low digital or English
literacy. Design for both with **role-based UI complexity** — not one UI for everyone.

- **Owner UI:** full dashboards, reports, settings. Dense is OK here.
- **Operator UI:** task-first and simplified. Big primary actions ("Receive Stock",
  "Dispatch Order", "Record Payment") as cards, not a dense ERP grid. One job per screen.
- **Localization-ready from day 1:** put every user-facing string in a central catalog
  (`lib/i18n.ts`). Ship English first; adding Urdu (and Roman Urdu, which many type) is then
  cheap. Operator-facing screens are the priority for Urdu.
- **Minimize typing:** dropdowns, searchable selects, +/− steppers, quantity/amount numeric
  keypads, "recent" and "favorite" pick-lists. Avoid free-text where a choice will do.
- **Icons + short labels + color.** Large tap targets (min 44px). Phone-first — staff will
  use this on a phone, likely alongside WhatsApp, so lean on familiar WhatsApp-like patterns.
- **Plain-language confirmations for anything that matters:** "Confirm: 50 bags to Ali
  Traders, Rs 2,50,000?" with a clear cancel. Offer undo where possible.
- **Local number formatting:** currency as "Rs 2,50,000" (South-Asian grouping), quantities
  with their unit always visible ("980 kg", "12 bags").

## How to use v0 / Lovable alongside Claude Code
Claude Code builds the app and the UI directly with shadcn/ui. Use v0 **only** to explore
the design of a specific tricky screen (e.g. the order builder or the dashboard), then hand
the result back to Claude Code to integrate against the real data layer. Don't let v0
generate data logic — it won't match our schema, tenancy, or money conventions.

### Reusable v0 / Lovable prompt (fill in the screen)
```
Design a single screen for "AgriFlow", a clean modern B2B SaaS for agricultural businesses.
Aesthetic: Linear/Stripe/Notion — minimal, fast, lots of whitespace, one neutral + one accent
color, mobile-first (must work at 375px). Use Tailwind + shadcn/ui components only.

Screen: <NAME, e.g. "Create Sales Order">
Purpose: <what the user accomplishes here>
Key elements:
- <list the fields / sections / actions>
Data shown (static placeholder, no real fetching):
- <list example rows/values in PKR, quantities in kg/bags>
States to include: default, empty, loading skeleton, and an error banner.
Constraints: no backend, no auth, no routing — just the presentational screen with mock data.
Money formatted like "Rs 12,500". Right-align numeric columns.
Output: a single self-contained React component using shadcn/ui + Tailwind.
```
Then in Claude Code: "Integrate this v0 component into `src/app/(app)/orders/new`, wiring it
to the real Server Action and Zod schema, replacing mock data with scoped queries."
