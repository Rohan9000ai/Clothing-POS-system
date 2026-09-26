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

## Day 3 — API skeleton ✅ VERIFIED WORKING
- [x] Set up `apps/api` with modules: auth, users, inventory, sales, suppliers, salesmen, expenses, reports, settings
- [x] Common utilities: env, logger, errors (5-category), error-handler middleware, validate middleware
- [x] Database connection + WAL mode + foreign key enforcement (fixed: $queryRawUnsafe for WAL pragma
since it returns a row, $executeRawUnsafe rejected it)
- [x] Health check endpoint — verified: GET /api/health → 200 OK, database check passing
- [x] main.ts entry point, all routers mounted, graceful shutdown
- [x] Fixed tsconfig scoping issue between src/ (main build) and prisma/seed.ts (separate
      tsconfig.seed.json) — db:seed verified working end-to-end


## Day 4 — Desktop shell ✅ VERIFIED WORKING
- [x] Electron main + preload set up (contextIsolation on, nodeIntegration off)
- [x] React + TypeScript + Vite + Tailwind + React Router configured
- [x] Basic window, app layout, sidebar (9 nav items), topbar (shop name + live clock)
- [x] Renderer connected to API health check — polls every 15s, shows
      Connected/Degraded/Disconnected status live on the dashboard
- [x] Fixed: Electron/esbuild install-scripts needed approval (same pattern as Day 2's argon2)
- [x] Fixed: tsconfig.main.json module/moduleResolution must both be "Node16" together
- [x] Fixed: tsconfig.json baseUrl deprecation, VS Code Tailwind CSS lint noise
- [x] Confirmed: requires apps/api AND apps/desktop dev servers running simultaneously
      in separate terminals during development


## Day 6 — Auth backend ✅ VERIFIED WORKING
- [x] User model already existed (Day 2) — password hashing via argon2 confirmed working end-to-end
- [x] Login endpoint (`POST /api/auth/login`) — validates credentials, checks ACTIVE status,
      returns JWT + safe user object (no password hash exposed)
- [x] JWT session handling (`apps/api/src/common/jwt.ts`) — sign/verify, configurable expiry via `AUTH_TOKEN_EXPIRY`
- [x] `requireAuth` middleware — verifies Bearer token, attaches `req.user`
- [x] `requireRole("ADMIN" | "CASHIER")` middleware — role-based route guarding, tested and confirmed
      blocking unauthorized access with proper 401/403 + AppError categories
- [x] `GET /api/auth/me` — returns current authenticated user from token
- [x] `POST /api/auth/logout` — stateless JWT logout endpoint (client discards token)
- [x] Admin-only user registration (`POST /api/users`, guarded by `requireRole("ADMIN")`) —
      verified: duplicate username rejected, password hashed, safe fields returned
- [x] `GET /api/users` — admin-only user listing, verified working
- [x] Resolved tsconfig `rootDir` conflict from shared package `paths` mapping — set `noEmit: true`
      for `apps/api` (type-check only; `tsx` handles runtime execution, proper build config deferred
      to packaging phase)
      

## Day 7 — Users module backend ✅ VERIFIED WORKING
- [x] Full CRUD: list, get by id, create, update (name/role), change password, toggle status, delete
- [x] Validation: unique username (checked on create), password strength (min 6 chars, at least
      one letter + one number — shared `passwordSchema` in `packages/validation/common.ts`),
      role restricted to ADMIN/CASHIER via Zod enum
- [x] Business rule: last active admin cannot be demoted, deactivated, or deleted
      (`cannotRemoveLastAdmin` guard) — verified blocking correctly with 409
- [x] Business rule: users with related records (sales, expenses, supplier transactions,
      inventory movements, audit logs) cannot be hard-deleted — soft status change required instead
      (per coding-standards.md "soft status fields instead of hard deletes")
- [x] All routes admin-only (`requireRole("ADMIN")` applied at router level via `.use()`)
- [x] Fixed `noUncheckedIndexedAccess` route-param typing issue with a shared `requireParam()` helper
      (`apps/api/src/common/request-params.ts`) instead of unsafe casts

---

## Notes / decisions log
- v1 is desktop-only, single PC, SQLite. Multi-terminal (PostgreSQL) is a future upgrade, not part of v1.
- No barcode in v1 — schema fields (`product_code`, `variant_sku`, `bill_no`) kept barcode-ready.
- Backups are non-negotiable priority: WAL mode + versioned automatic backups + manual backup/restore buttons.
- Full bilingual Urdu/English support required in both Admin and Cashier UI, including receipts.
