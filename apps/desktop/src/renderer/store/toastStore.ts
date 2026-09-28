import { create } from "zustand";

export type ToastTone = "success" | "error";

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (tone, message) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, tone, message }] });
    // Errors stay a bit longer so they can actually be read.
    setTimeout(() => get().dismiss(id), tone === "error" ? 6000 : 3500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));