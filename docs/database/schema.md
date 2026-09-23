# Database Schema Reference — Muzammil Store POS v1

This is the authoritative reference for the database. The Prisma schema (Day 2) is generated
from this document — if they ever disagree, update both together.

**Engine:** SQLite, WAL mode enabled, `PRAGMA foreign_keys = ON`.
**Money storage:** decision to finalize on Day 2 — integer minor units (e.g. paisa) recommended
to avoid floating-point rounding errors; documented here once locked in.

## Tables

### users
id · full_name · username (unique) · password_hash · role (`ADMIN`\|`CASHIER`) · status (`ACTIVE`\|`INACTIVE`) · created_at · updated_at

### salesmen
id · user_id (optional, FK → users) · name · phone · cnic · join_date · salary · status · created_at · updated_at

### categories
id · name (unique) · status · created_at

### products
id · product_code (auto-generated internal code, **not** a barcode) · name · category_id (FK) · base_price · cost_price (optional) · status (`ACTIVE`\|`INACTIVE`) · primary_image_url · created_at · updated_at

### product_variants
id · product_id (FK) · size · color · variant_sku (unique) · quantity · price_override (optional) · status · created_at · updated_at
**Unique constraint:** (product_id, size, color)

### product_images
id · product_id (FK) · image_url · is_primary · sort_order

### customers
id · name (default `"Walk-in"`) · phone · address · opening_balance · status · created_at

### suppliers
id · name · phone · address · opening_balance · status · created_at · updated_at

### supplier_transactions
id · supplier_id (FK) · type (`PURCHASE`\|`PAYMENT`\|`ADJUSTMENT`) · amount · payment_method (`CASH`\|`ONLINE_TRANSFER`) · reference_no · notes · date · created_by (FK → users) · created_at
**Derived:** supplier remaining balance = opening_balance + Σ purchases − Σ payments

### sales
id · bill_no (unique, sequential) · sale_date · cashier_id (FK → users) · salesman_id (optional, FK) · customer_id (default Walk-in, FK) · sub_total · discount_total · net_total · payment_status (`PAID`\|`PARTIAL`\|`UNPAID`) · sale_status (`COMPLETED`\|`VOID`) · notes · created_at

### sale_items
id · sale_id (FK) · product_id (FK) · variant_id (FK) · product_name_snapshot · size_snapshot · color_snapshot · unit_price · quantity · line_discount · line_total
**Why snapshots:** old invoices must stay correct even if the product is later renamed, repriced, or deactivated.

### sale_payments
id · sale_id (FK) · method (`CASH`\|`EASYPAISA`\|`JAZZCASH`\|`BANK_TRANSFER`) · amount · reference_no (required if method ≠ CASH) · paid_at

### expenses
id · expense_date · title · type (`ELECTRICITY`\|`SALARIES`\|`PAYOUTS`\|`SUPPLIER_PAYMENT`\|`TAXES`\|`OTHER`) · amount · payment_method (`CASH`\|`ONLINE_TRANSFER`) · reference_no · supplier_id (optional, FK) · salesman_id (optional, FK) · notes · created_by (FK → users) · status (`ACTIVE`\|`VOID`) · created_at
**Rule:** if type = `OTHER`, title is required.

### settings
id · shop_name · currency · receipt_header · receipt_footer · tax_percent · low_stock_threshold (default 5) · updated_at

### inventory_movements
id · variant_id (FK) · movement_type (`SALE`\|`PURCHASE`\|`ADJUSTMENT`\|`RETURN`\|`VOID`) · quantity_change · reference_type · reference_id · created_by (FK → users) · created_at

### audit_logs
id · user_id (FK) · action · entity · entity_id · old_data · new_data · created_at

---

## Validation rules (enforced client-side with Zod and re-validated server-side)

- Username unique.
- Password hashed (Argon2), minimum length enforced.
- Role must be `ADMIN` or `CASHIER`.
- Product name and category required.
- Price ≥ 0.
- Quantity is a whole number, ≥ 0.
- Variant size + color unique per product.
- Sale quantity cannot exceed available stock.
- Discount cannot be negative or exceed subtotal.
- Payment total must equal net total unless payment_status is `PARTIAL`.
- Non-cash payments require a reference number.
- Expense amount > 0.
- Expense type `OTHER` requires a title.
- Supplier/salesman phone & CNIC formats validated.
- Inactive products cannot be sold.
- Bill number unique and sequential.
- All foreign keys enforced at the database level.

## Future barcode readiness

`product_code`, `variant_sku`, and `bill_no` are structured so a future update can add:
- a `barcodes` table
- a `barcode` field on `product_variants`
- scanner input handling in the Cashier POS
- barcode label generation

...without redesigning any existing table.
