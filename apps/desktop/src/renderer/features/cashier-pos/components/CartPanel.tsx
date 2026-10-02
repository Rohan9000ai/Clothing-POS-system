import { useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button, Select } from "@muzammil-pos/ui";
import { formatCurrency, fromPaisa, toPaisa } from "@muzammil-pos/utils";
import type { Salesman } from "@muzammil-pos/types";
import { useAuthStore } from "../../../store/authStore";
import { useCartStore } from "../../../store/cartStore";
import { PaymentModal } from "./PaymentModal";

interface CartPanelProps {
  salesmen: Salesman[];
}

export function CartPanel({ salesmen }: CartPanelProps) {
  const user = useAuthStore((s) => s.user);
  const { items, salesmanId, setSalesmanId, updateQuantity, updateLineDiscount, removeItem } =
    useCartStore();

  const [discountDrafts, setDiscountDrafts] = useState<Record<string, string>>({});
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const subTotal = useMemo(() => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0), [items]);
  const discountTotal = useMemo(() => items.reduce((sum, i) => sum + i.lineDiscount, 0), [items]);
  const netTotal = subTotal - discountTotal;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const salesmanOptions = [
    { value: "", label: "No salesman" },
    ...salesmen.map((s) => ({ value: s.id, label: s.name })),
  ];

  function handleDiscountBlur(variantId: string, unitPrice: number, quantity: number) {
    const raw = discountDrafts[variantId];
    if (raw === undefined) return;
    const rupees = Number(raw);
    const paisa = Number.isNaN(rupees) ? 0 : toPaisa(rupees);
    updateLineDiscount(variantId, Math.min(paisa, unitPrice * quantity));
    setDiscountDrafts((prev) => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-gray-200 p-4">
        <div>
          <p className="text-xs font-medium text-gray-500">Customer</p>
          <p className="mt-1 rounded-control border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            Walk-in Customer
          </p>
        </div>
        <Select
          label="Salesman"
          value={salesmanId ?? ""}
          onChange={(e) => setSalesmanId(e.target.value || null)}
          options={salesmanOptions}
        />
        <div>
          <p className="text-xs font-medium text-gray-500">Cashier</p>
          <p className="mt-1 rounded-control border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {user?.fullName ?? "—"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-sm text-gray-400">
            <p>Cart is empty.</p>
            <p className="text-xs">Select products from the left to start a sale.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.variantId} className="rounded-control border border-gray-200 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                    <p className="text-xs text-gray-400">
                      {item.size} / {item.color} · Stock available: {item.availableStock}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="rounded-control p-1 text-gray-300 hover:bg-danger-light hover:text-danger"
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="h-6 w-6 rounded-control border border-gray-300 text-gray-500 hover:bg-gray-50"
                    >
                      <Minus size={12} className="mx-auto" />
                    </button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.availableStock}
                      className="h-6 w-6 rounded-control border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                    >
                      <Plus size={12} className="mx-auto" />
                    </button>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(item.unitPrice * item.quantity - item.lineDiscount)}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-400">Discount (Rs.)</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={
                      discountDrafts[item.variantId] ??
                      (item.lineDiscount > 0 ? String(fromPaisa(item.lineDiscount)) : "")
                    }
                    onChange={(e) => setDiscountDrafts((prev) => ({ ...prev, [item.variantId]: e.target.value }))}
                    onBlur={() => handleDiscountBlur(item.variantId, item.unitPrice, item.quantity)}
                    className="w-20 rounded-control border border-gray-300 px-2 py-1 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5 border-t border-gray-200 p-4 text-sm">
        <div className="flex justify-between text-gray-500">
          <span>Items</span>
          <span>{itemCount}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Subtotal</span>
          <span>{formatCurrency(subTotal)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Discount</span>
          <span>−{formatCurrency(discountTotal)}</span>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-1.5 text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatCurrency(netTotal)}</span>
        </div>

        <Button className="mt-3 w-full" disabled={items.length === 0} onClick={() => setIsPaymentOpen(true)}>
          Proceed to payment
        </Button>
        <p className="text-center text-[11px] text-gray-400">Invoice printing is added in the next step.</p>
      </div>

      {isPaymentOpen && <PaymentModal onClose={() => setIsPaymentOpen(false)} />}
    </div>
  );
}