import type { SaleDetail } from "../../services/sales";

/** A made-up bill, used only for the receipt preview and the test print. */
export function buildSampleSale(taxPercent: number): SaleDetail {
  const now = new Date().toISOString();

  return {
    id: "sample",
    billNo: "SAMPLE-0001",
    saleDate: now,
    cashierId: "sample",
    salesmanId: "sample",
    customerId: "sample",
    subTotal: 590000,
    discountTotal: 20000,
    netTotal: 570000,
    taxPercent,
    paymentStatus: "PAID",
    saleStatus: "COMPLETED",
    notes: null,
    createdAt: now,
    items: [
      {
        id: "sample-1",
        saleId: "sample",
        productId: "sample-1",
        variantId: "sample-1",
        productNameSnapshot: "Classic Shalwar Kameez",
        sizeSnapshot: "M",
        colorSnapshot: "White",
        unitPrice: 350000,
        quantity: 1,
        lineDiscount: 0,
        lineTotal: 350000,
      },
      {
        id: "sample-2",
        saleId: "sample",
        productId: "sample-2",
        variantId: "sample-2",
        productNameSnapshot: "Winter Shawl",
        sizeSnapshot: "Free",
        colorSnapshot: "Grey",
        unitPrice: 120000,
        quantity: 2,
        lineDiscount: 20000,
        lineTotal: 220000,
      },
    ],
    payments: [
      { id: "sample-p", saleId: "sample", method: "CASH", amount: 570000, referenceNo: null, paidAt: now },
    ],
    customer: { id: "sample", name: "Walk-in" },
    salesman: { id: "sample", name: "Ali Ahmed" },
    cashier: { id: "sample", fullName: "Store Admin", username: "admin" },
  };
}