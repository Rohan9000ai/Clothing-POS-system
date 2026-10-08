-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expense_date" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payment_method" TEXT NOT NULL,
    "reference_no" TEXT,
    "supplier_id" TEXT,
    "salesman_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier_transaction_id" TEXT,
    CONSTRAINT "expenses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "expenses_salesman_id_fkey" FOREIGN KEY ("salesman_id") REFERENCES "salesmen" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_supplier_transaction_id_fkey" FOREIGN KEY ("supplier_transaction_id") REFERENCES "supplier_transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_expenses" ("amount", "created_at", "created_by", "expense_date", "id", "notes", "payment_method", "reference_no", "salesman_id", "status", "supplier_id", "title", "type") SELECT "amount", "created_at", "created_by", "expense_date", "id", "notes", "payment_method", "reference_no", "salesman_id", "status", "supplier_id", "title", "type" FROM "expenses";
DROP TABLE "expenses";
ALTER TABLE "new_expenses" RENAME TO "expenses";
CREATE UNIQUE INDEX "expenses_supplier_transaction_id_key" ON "expenses"("supplier_transaction_id");
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
