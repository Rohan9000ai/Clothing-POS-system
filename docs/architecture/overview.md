# Architecture Overview — Muzammil Store POS v1

## Deployment shape
Desktop app with a local SQLite database, running on a single shop PC/terminal for v1.
If multiple cashier terminals are ever needed, the same frontend can be reused against a
backend moved onto a local network server (PostgreSQL) — this is a v2+ consideration, not
part of v1 build work.

## Layers

- **Presentation** — Desktop UI screens (`apps/desktop/src/renderer`)
- **Application** — Business logic / use cases (`apps/api/src/modules/*/*.service.ts`)
- **Domain** — Rules for sales, stock, expenses, profit/loss (pure functions where possible,
  colocated with the relevant module or in `packages/utils` if shared)
- **Infrastructure** — Database (Prisma), printing, PDF generation, authentication, logging
  (`apps/api/src/database`, `apps/desktop/src/main/printing`, `apps/api/src/common`)

## High-level flow

1. User logs in as Admin or Cashier.
2. Role determines visible pages (route guarding in `renderer/app/router`).
3. Admin manages inventory, suppliers, salesmen, expenses, users, reports, settings.
4. Cashier creates a sale invoice.
5. Sale transaction (single DB transaction):
   - Validate stock
   - Save invoice
   - Save payment method(s)
   - Decrement stock
   - Print receipt (best-effort, outside the DB transaction — see `error-handling.md`)
   - Reflect sale in Admin dashboard
6. Low stock alert appears when quantity is below the configured threshold (`settings.low_stock_threshold`, default 5).

## Cross-cutting concerns baked in from Day 1

- **i18n (Urdu/English + RTL)** — all user-facing strings pulled from `locales/en` and `locales/ur`;
  layout direction switches with the language, not just the text.
- **Data safety** — WAL-mode SQLite, transactional writes for anything touching stock/money,
  automatic versioned backups, manual backup/restore in Settings.
- **Caching** — frequently-read, rarely-changed data (active products, categories, settings) cached
  in memory on the renderer/service side, invalidated on relevant writes.
- **Barcode-readiness** — schema fields chosen so barcode support is an addition, not a migration.

See `docs/database/schema.md` for the full data model and `docs/architecture/coding-standards.md`
and `docs/architecture/error-handling.md` for how code is written and how failures are handled.
