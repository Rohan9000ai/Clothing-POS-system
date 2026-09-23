# Design Reference — Muzammil Store POS

Style direction based on the reference screenshots provided (ApexPOS / NexaPOS / SwiftPOS
style examples). We are **not** copying any branding — just the layout patterns and visual language.

## Visual language
- Clean SaaS style, card-based layout, soft shadows, rounded corners (~12px on cards, pill-shaped
  buttons/badges)
- Primary color: indigo/purple (`#4F46E5`-ish), success green, danger red, amber for warnings/low stock
- Light mode primary, optional dark mode later
- Sidebar navigation (left) + top bar (shop name, active user, date/time, quick actions)
- Status badges: PAID / PARTIAL / UNPAID, ACTIVE / LOW STOCK / OUT OF STOCK, ACTIVE / INACTIVE

## Per-screen patterns to follow
- **Login** — split screen: branded/hero side + simple credential form
- **Admin Dashboard** — 4 KPI cards on top row, 7-day bar chart, two-column bottom row
  (recent sales table + low-stock alert panel)
- **Inventory** — searchable/filterable data table with thumbnail, status badge, quick actions
- **Add Product** — two-column form: core fields left, sizing chips + image upload right
- **Sales ledger** — KPI row + searchable table with payment-status badges and view/print/void actions
- **Suppliers / Salesmen** — add-form on left/top + directory table below, with balance/salary columns
- **Expenses** — quick-add row form + history table with day/week/month/custom filter tabs + Print PDF
- **Reports** — category shortcut cards + financial summary KPI row + revenue-vs-expenses chart +
  breakdown list
- **Users** — inline add-user row form + user table with active/inactive toggle
- **Settings (Receipt)** — form fields on left, **live receipt preview** on right — this pattern is
  important, replicate it exactly for the Urdu/English receipt config too
- **Cashier POS** — product grid (left, with stock count + quick-add), live cart/invoice panel (right)
  with customer/salesman fields, totals breakdown, payment mode dropdown, Save & Print button
- **Printable invoice** — formatted A4-style invoice: shop header, bill-to box, itemized table,
  subtotal/discount/grand total, download PDF + print buttons
- **Thermal receipt** — narrow receipt-width layout, dashed separators between sections, item list,
  total, payment/auth line, reprint button

## Design tokens (starting point, refine in Day 4 when Tailwind/shadcn is wired up)
- Type scale: Display 32 / Title 24 / Section 16 / Body 14 / Caption 12
- Spacing scale: 4 · 8 · 16 · 24 · 32 · 48
- Card radius: 12px · Control radius: 8px · Pills: fully rounded
- Icon style: rounded, Lucide-style, ~16–20px, 2px stroke weight

## RTL / Urdu adaptation notes
- When Urdu is active: mirror the layout — sidebar moves to the right, text aligns right,
  table columns read right-to-left, numbers/prices stay LTR (standard convention for RTL UIs
  with numeric data)
- Receipt/invoice content must also render correctly in Urdu, including on the thermal printer
  (font choice for the printing library needs Urdu glyph support — flag this when we implement
  printing in the feature build-out phase)
