-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bill_no" TEXT NOT NULL,
    "sale_date" DATETIME NOT NULL,
    "cashier_id" TEXT NOT NULL,
    "salesman_id" TEXT,
    "customer_id" TEXT NOT NULL,
    "sub_total" INTEGER NOT NULL,
    "discount_total" INTEGER NOT NULL DEFAULT 0,
    "net_total" INTEGER NOT NULL,
    "tax_percent" REAL NOT NULL DEFAULT 0,
    "payment_status" TEXT NOT NULL,
    "sale_status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_cashier_id_fkey" FOREIGN KEY ("cashier_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_salesman_id_fkey" FOREIGN KEY ("salesman_id") REFERENCES "salesmen" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_sales" ("bill_no", "cashier_id", "created_at", "customer_id", "discount_total", "id", "net_total", "notes", "payment_status", "sale_date", "sale_status", "salesman_id", "sub_total") SELECT "bill_no", "cashier_id", "created_at", "customer_id", "discount_total", "id", "net_total", "notes", "payment_status", "sale_date", "sale_status", "salesman_id", "sub_total" FROM "sales";
DROP TABLE "sales";
ALTER TABLE "new_sales" RENAME TO "sales";
CREATE UNIQUE INDEX "sales_bill_no_key" ON "sales"("bill_no");
CREATE INDEX "sales_sale_date_idx" ON "sales"("sale_date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
