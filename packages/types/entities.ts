/**
 * Shared entity types — mirror the Prisma schema (apps/api/prisma/schema.prisma)
 * but are transport-shaped for the renderer/API boundary:
 * - Dates are ISO strings (as they come over JSON), not Date objects
 * - Money fields are numbers in PAISA (smallest currency unit) — never format
 *   or do math on them without going through packages/utils/currency.ts
 */

import type {
  UserRole,
  Status,
  SupplierTxnType,
  PayoutMethod,
  SalePaymentMethod,
  PaymentStatus,
  SaleStatus,
  ExpenseType,
  ExpenseStatus,
  InventoryMovementType,
} from "./enums";

export interface User {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Salesman {
  id: string;
  userId: string | null;
  name: string;
  phone: string;
  cnic: string;
  joinDate: string;
  salary: number; // paisa
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  status: Status;
  createdAt: string;
}

export interface Product {
  id: string;
  productCode: string;
  name: string;
  categoryId: string;
  category?: Category;
  basePrice: number; // paisa
  costPrice: number | null; // paisa
  status: Status;
  primaryImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariant[];
  images?: ProductImage[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  variantSku: string;
  quantity: number;
  priceOverride: number | null; // paisa
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  openingBalance: number; // paisa
  status: Status;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  openingBalance: number; // paisa
  status: Status;
  createdAt: string;
  updatedAt: string;
  /** Derived, calculated server-side: openingBalance + purchases - payments */
  remainingBalance?: number;
}

export interface SupplierTransaction {
  id: string;
  supplierId: string;
  type: SupplierTxnType;
  amount: number; // paisa
  paymentMethod: PayoutMethod;
  referenceNo: string | null;
  notes: string | null;
  date: string;
  createdById: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  billNo: string;
  saleDate: string;
  cashierId: string;
  salesmanId: string | null;
  customerId: string;
  subTotal: number; // paisa
  discountTotal: number; // paisa
  netTotal: number; // paisa
  paymentStatus: PaymentStatus;
  saleStatus: SaleStatus;
  notes: string | null;
  createdAt: string;
  items?: SaleItem[];
  payments?: SalePayment[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  variantId: string;
  productNameSnapshot: string;
  sizeSnapshot: string;
  colorSnapshot: string;
  unitPrice: number; // paisa
  quantity: number;
  lineDiscount: number; // paisa
  lineTotal: number; // paisa
}

export interface SalePayment {
  id: string;
  saleId: string;
  method: SalePaymentMethod;
  amount: number; // paisa
  referenceNo: string | null;
  paidAt: string;
}

export interface Expense {
  id: string;
  expenseDate: string;
  title: string;
  type: ExpenseType;
  amount: number; // paisa
  paymentMethod: PayoutMethod;
  referenceNo: string | null;
  supplierId: string | null;
  salesmanId: string | null;
  notes: string | null;
  createdById: string;
  status: ExpenseStatus;
  createdAt: string;
}

export interface Settings {
  id: string;
  shopName: string;
  currency: string;
  receiptHeader: string | null;
  receiptFooter: string | null;
  taxPercent: number;
  lowStockThreshold: number;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  variantId: string;
  movementType: InventoryMovementType;
  quantityChange: number;
  referenceType: string;
  referenceId: string;
  createdById: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  oldData: string | null;
  newData: string | null;
  createdAt: string;
}