# Coding Standards & Conventions — Muzammil Store POS

This document is the shared reference for how code is written and organized across
the whole monorepo. Keep it updated if a convention changes.

## 1. Languages & tooling

- **TypeScript everywhere** (desktop renderer, main process, API). `strict: true` in every `tsconfig.json`.
- **ESLint + Prettier** enforced across all workspaces (shared config lives in `packages/config`).
- **No `any`** unless explicitly justified with a comment (`// any: reason`).
- Prefer **named exports** over default exports, except for React page/screen components.

## 2. Naming conventions

| Item | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `ProductCard.tsx` |
| Files (hooks) | camelCase, `use` prefix | `useCartTotals.ts` |
| Files (utils/services) | kebab-case | `sale-calculations.ts` |
| React components | PascalCase | `CashierBillingScreen` |
| Variables / functions | camelCase | `calculateNetTotal()` |
| Types / interfaces | PascalCase | `SaleItem`, `ProductVariant` |
| Zod schemas | camelCase + `Schema` suffix | `createSaleSchema` |
| Database tables | snake_case, plural | `sale_items`, `product_variants` |
| Database columns | snake_case | `net_total`, `created_at` |
| Enums (DB + TS) | UPPER_SNAKE_CASE values | `PAID`, `PARTIAL`, `UNPAID` |
| Zustand stores | camelCase + `Store` suffix | `useAuthStore`, `useCartStore` |
| Feature folders | kebab-case | `cashier-pos/`, `admin-dashboard/` |
| i18n translation keys | dot.notation, feature-scoped | `cashierPos.totals.netTotal` |

## 3. Folder/feature structure (frontend)

Each feature under `apps/desktop/src/renderer/features/<feature-name>/` follows:

```
feature-name/
├── components/     # UI pieces used only by this feature
├── hooks/          # feature-specific hooks
├── api/            # calls into apps/api via IPC/service layer
├── types.ts        # feature-local types (shared types go in packages/types)
├── FeatureScreen.tsx
└── index.ts
```

Shared, reusable pieces (buttons, tables, modals, KPI cards, etc.) always go in
`apps/desktop/src/renderer/components/` or `packages/ui/` if they're generic enough
to be used outside the desktop app later (e.g., by `web-admin`).

## 4. Backend (apps/api) structure

Each module under `apps/api/src/modules/<module-name>/` follows:

```
module-name/
├── module-name.controller.ts   # or ipc-handler for Electron IPC
├── module-name.service.ts      # business logic (Application + Domain layers)
├── module-name.repository.ts   # database access via Prisma (Infrastructure layer)
├── dto/                        # request/response shapes
└── module-name.module.ts
```

- **Services never talk to Prisma directly for anything non-trivial** — go through a repository.
- **All multi-step writes (sale creation, stock adjustment, supplier payment) run inside
  a Prisma `$transaction`.** No exceptions — see `docs/architecture/error-handling.md`.

## 5. Git conventions

### Branch strategy
- `main` — always stable, always what would go to the shop PC.
- `develop` — integration branch for in-progress work.
- Feature branches: `feature/<short-description>` (e.g., `feature/cashier-pos-cart`)
- Bugfix branches: `fix/<short-description>`
- Release tags: `v1.0.0`, `v1.1.0`, etc. (semantic versioning)

### Commit messages (Conventional Commits)
```
<type>(<scope>): <short summary>

feat(cashier-pos): add discount field to cart line items
fix(inventory): prevent negative quantity on variant update
docs(readme): update setup instructions
chore(deps): bump prisma to 5.x
refactor(sales): extract net-total calculation into shared util
```
Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`.

### Pull requests (even solo — keep history clean)
- One feature/fix per branch.
- Squash-merge into `develop`.
- `develop` → `main` only at the end of a tested milestone (e.g., end of a "day" in `TASKS.md`).

## 6. Database conventions

- Every table has `created_at`; tables that can be edited also have `updated_at`.
- Soft status fields (`ACTIVE` / `INACTIVE` / `VOID`) instead of hard deletes for
  anything referenced elsewhere (products, users, suppliers, salesmen, sales, expenses).
- Money stored as **integers in the smallest currency unit** (e.g., paisa) OR fixed-precision
  decimal — never raw floating point — to avoid rounding errors. Decision finalized in
  `docs/database/schema.md` before migrations are written.
- All foreign keys enforced at the database level (SQLite `PRAGMA foreign_keys = ON`).

## 7. i18n rules

- No hardcoded user-facing strings in components — always pulled from `locales/en` / `locales/ur`.
- Every new UI string added to **both** language files in the same commit.
- Urdu strings reviewed for correctness before each release (flagged in PR if translation is a placeholder).

## 8. Testing expectations

- Business logic (Domain layer: totals, stock validation, profit/loss calculations) gets **unit tests**.
- Sale creation, stock deduction, and supplier balance flows get **integration tests**
  (these are the flows that must never leave the database in a half-written state).
- Critical user flows (login, create sale, print invoice, add product) get **e2e tests** with Playwright,
  added incrementally — not required to block early development.

## 9. Definition of done (per feature)

- [ ] Code follows the conventions above
- [ ] Both `en` and `ur` translation strings added
- [ ] Input validated with a Zod schema (client) and re-validated server-side
- [ ] Errors handled per `docs/architecture/error-handling.md` categories
- [ ] No sale/stock/payment logic outside a database transaction
- [ ] Relevant docs updated (`docs/database/schema.md` if schema touched)
