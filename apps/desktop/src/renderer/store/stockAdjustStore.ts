import { create } from "zustand";

export interface StockAdjustRequest {
  /** e.g. "sweater — L / Navy" */
  label: string;
  currentQuantity: number;
  /** Does the change. Throw to show the error inside the window. */
  run: (quantityChange: number, reason: string) => Promise<void>;
}

interface State {
  request: (StockAdjustRequest & { id: number }) | null;
  open: (request: StockAdjustRequest) => void;
  close: () => void;
}

let counter = 0;

export const useStockAdjustStore = create<State>((set) => ({
  request: null,
  open: (request) => set({ request: { ...request, id: ++counter } }),
  close: () => set({ request: null }),
}));

export function requestStockAdjust(request: StockAdjustRequest) {
  useStockAdjustStore.getState().open(request);
}