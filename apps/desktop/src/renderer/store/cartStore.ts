import { create } from "zustand";

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  color: string;
  unitPrice: number; // paisa
  quantity: number;
  availableStock: number;
  lineDiscount: number; // paisa
}

interface CartState {
  items: CartItem[];
  /** null = default Walk-in customer. Real customer selection arrives with the Customers module. */
  customerId: string | null;
  salesmanId: string | null;
  addItem: (item: Omit<CartItem, "quantity" | "lineDiscount"> & { quantity: number }) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  updateLineDiscount: (variantId: string, lineDiscount: number) => void;
  removeItem: (variantId: string) => void;
  setSalesmanId: (id: string | null) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  salesmanId: null,

  addItem: (item) => {
    const { items } = get();
    const existing = items.find((i) => i.variantId === item.variantId);

    if (existing) {
      const nextQuantity = Math.min(existing.quantity + item.quantity, existing.availableStock);
      set({
        items: items.map((i) => (i.variantId === item.variantId ? { ...i, quantity: nextQuantity } : i)),
      });
    } else {
      const quantity = Math.min(item.quantity, item.availableStock);
      set({ items: [...items, { ...item, quantity, lineDiscount: 0 }] });
    }
  },

  updateQuantity: (variantId, quantity) => {
    set({
      items: get().items.map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.availableStock)) }
          : i
      ),
    });
  },

  updateLineDiscount: (variantId, lineDiscount) => {
    set({
      items: get().items.map((i) => {
        if (i.variantId !== variantId) return i;
        const maxDiscount = i.unitPrice * i.quantity;
        return { ...i, lineDiscount: Math.max(0, Math.min(lineDiscount, maxDiscount)) };
      }),
    });
  },

  removeItem: (variantId) => set({ items: get().items.filter((i) => i.variantId !== variantId) }),

  setSalesmanId: (id) => set({ salesmanId: id }),

  clearCart: () => set({ items: [], salesmanId: null }),
}));