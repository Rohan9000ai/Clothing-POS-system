# Muzammil Store POS — Task Tracker

Simple day-by-day task list acting as our issue tracker for this solo/small project.
Check items off as they're completed. Add new days as we go.

Legend: `[ ]` to do · `[~]` in progress · `[x]` done

---

## Day 1 — Project Setup
- [x] Create monorepo structure: `apps/desktop`, `apps/api`, `packages`, `database`, `docs`, `tests`
- [x] Initialize Git
- [x] Root `README.md`
- [x] Root `.gitignore`
- [x] `.env.example` environment config template
- [x] Coding standards, naming conventions, branch strategy (`docs/architecture/coding-standards.md`)
- [x] Task tracker (`TASKS.md`, this file)
- [x] Root workspace config (`package.json` with npm workspaces)
- [x] Shared configs in `packages/config` (tsconfig base, eslint, prettier)
- [x] Placeholder `package.json` in each app/package so the workspace resolves
- [x] Initial commit

## Day 2 — Database schema & Prisma setup
- [x] Write full Prisma schema for all 16 tables (from `docs/database/schema.md`)
- [x] Decide money storage format — Int storing paisa (smallest currency unit)
- [x] First migration (`20260923075010_init`) created and applied
- [x] Seed script: default admin user, default categories, default settings row — verified working, idempotent on re-run
- [x] Enable SQLite WAL mode + foreign key enforcement (via `apps/api/src/database/prisma.ts` pragmas)
- [x] Note: SQLite doesn't support native Prisma `enum` — all enum-like fields are `String` columns,
with allowed values defined in `packages/types/enums.ts` for TypeScript-side safety

## Day 3 — Backend core (planned)
- [ ] `apps/api` module scaffolding for auth, users, inventory, sales, suppliers, salesmen, expenses, settings
- [ ] Auth service (login, password hashing with Argon2, session/JWT issuing)
- [ ] Role-based access guard (ADMIN vs CASHIER)
- [ ] Base error-handling middleware (per `docs/architecture/error-handling.md`)

## Day 3 — API skeleton ✅ VERIFIED WORKING
- [x] Set up `apps/api` with modules: auth, users, inventory, sales, suppliers, salesmen, expenses, reports, settings
- [x] Common utilities: env, logger, errors (5-category), error-handler middleware, validate middleware
- [x] Database connection + WAL mode + foreign key enforcement (fixed: $queryRawUnsafe for WAL pragma
since it returns a row, $executeRawUnsafe rejected it)
- [x] Health check endpoint — verified: GET /api/health → 200 OK, database check passing
- [x] main.ts entry point, all routers mounted, graceful shutdown
- [x] Fixed tsconfig scoping issue between src/ (main build) and prisma/seed.ts (separate
      tsconfig.seed.json) — db:seed verified working end-to-end

## Day 5 — Login & role routing (planned)
- [ ] Login screen UI (per design reference)
- [ ] Auth flow wired to backend
- [ ] Redirect to Admin Dashboard or Cashier POS based on role
- [ ] Session persistence + logout

## Day 6+ — Feature build-out (planned, one feature per day/session)
- [ ] Admin Dashboard (KPIs, 7-day chart, recent sales, low stock)
- [ ] Inventory (list, add/edit product + variants, images)
- [ ] Cashier POS billing screen + invoice creation (transactional)
- [ ] Thermal + PDF invoice printing
- [ ] Sales ledger (view/void/print/search)
- [ ] Suppliers + supplier transactions
- [ ] Salesmen management
- [ ] Expenses (add/list/filter/print PDF)
- [ ] Reports center (receivables, payables, sales, stock, financial, profit/loss)
- [ ] Users management
- [ ] Settings (receipt config with live preview)
- [ ] Backup & restore (automatic + manual, versioned)
- [ ] Audit logging across critical actions
- [ ] Low stock alert wiring (threshold from settings)
- [ ] Full Urdu translation pass + RTL QA
- [ ] Packaging with electron-builder → installable app for the shop PC

---

## Notes / decisions log
- v1 is desktop-only, single PC, SQLite. Multi-terminal (PostgreSQL) is a future upgrade, not part of v1.
- No barcode in v1 — schema fields (`product_code`, `variant_sku`, `bill_no`) kept barcode-ready.
- Backups are non-negotiable priority: WAL mode + versioned automatic backups + manual backup/restore buttons.
- Full bilingual Urdu/English support required in both Admin and Cashier UI, including receipts.
