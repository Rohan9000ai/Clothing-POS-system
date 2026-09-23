# Muzammil Store POS — مزمل اسٹور POS

A desktop Point-of-Sale system built for **Muzammil Store**, a family clothing shop.
Version 1 is a **single-PC desktop application** (Electron + React + TypeScript + SQLite)
covering billing, inventory, suppliers, salesmen, expenses, and reporting — with a
bilingual **Urdu / English** interface for both the Admin and Cashier screens.

> اردو نوٹ: یہ سافٹ ویئر مزمل اسٹور کے لیے خاص طور پر بنایا گیا ہے۔ اس میں بلنگ، اسٹاک، سپلائرز،
> سیلز مین اور اخراجات کا مکمل ریکارڈ رکھا جا سکتا ہے۔

---

## 1. What this system does

- **Admin dashboard** — sales overview, inventory, suppliers, salesmen, expenses, reports, users, settings
- **Cashier POS screen** — fast manual product search & billing, multiple payment methods, thermal receipt printing
- **Offline-first** — runs fully on one shop PC, no internet required for daily operation
- **Data safety first** — WAL-mode SQLite, transactional writes, versioned automatic backups
- **Built to grow** — barcode support and multi-terminal/networked mode can be added later without a schema rewrite

## 2. Tech stack

| Layer | Choice |
|---|---|
| Desktop shell | Electron |
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Forms/validation | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Node.js (NestJS-style modular services, embeddable in Electron) |
| Database | SQLite (WAL mode) via Prisma ORM |
| Auth | Session/JWT + Argon2 password hashing |
| PDF reports | pdfmake |
| Thermal printing | node-thermal-printer / Electron print API |
| i18n | i18next (English + Urdu, RTL-aware) |
| Packaging | electron-builder |
| Testing | Vitest + Playwright |

See [`docs/architecture`](./docs/architecture) for the full design and
[`docs/database`](./docs/database) for the schema reference.

## 3. Monorepo layout

```
pos-system/
├── apps/
│   ├── desktop/     # Electron shell + React renderer (Admin + Cashier UI)
│   ├── api/         # Modular backend services (business logic, data access)
│   └── web-admin/   # Reserved for future responsive/mobile admin access
├── packages/
│   ├── ui/          # Shared UI components
│   ├── types/       # Shared TypeScript types/interfaces
│   ├── validation/  # Shared Zod schemas
│   ├── utils/        # Shared helper functions
│   └── config/      # Shared config (eslint, tsconfig, tailwind, i18n base)
├── database/
│   ├── migrations/  # Prisma migrations
│   ├── seeds/       # Seed data (default admin user, categories, settings)
│   └── backups/     # Local database backups (never committed)
├── docs/            # Architecture, database, api, and user-guide docs
├── scripts/         # Dev/build/backup utility scripts
└── tests/           # Cross-cutting unit / integration / e2e tests
```

## 4. Getting started (development)

```bash
# install dependencies for all workspaces
npm install

# run the desktop app in dev mode (renderer + Electron)
npm run dev --workspace=apps/desktop

# run database migrations
npm run db:migrate --workspace=apps/api

# seed default admin user + categories + settings
npm run db:seed --workspace=apps/api
```

See `.env.example` for required environment variables.

## 5. Core principles for this project

1. **No sale is ever half-saved.** Stock changes and invoice creation happen in one database transaction.
2. **Old invoices never change**, even if a product's name/price changes later (snapshot fields on `sale_items`).
3. **Every screen works in Urdu and English**, switchable at runtime, with correct RTL layout for Urdu.
4. **Backups are automatic and versioned.** The shop owner should never be able to lose data from a crash.
5. **Barcode-ready, not barcode-built.** v1 has no scanner support, but `product_code`, `variant_sku`,
   and `bill_no` are structured so barcode can be added later without touching the schema.

## 6. Status

🚧 **Day 1 — Project scaffolding in progress.** See [`TASKS.md`](./TASKS.md) for the current build plan.

---
Built with care for **Muzammil Store (مزمل اسٹور)**.
