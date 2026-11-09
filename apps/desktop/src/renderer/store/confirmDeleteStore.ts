import { create } from "zustand";

export interface DeleteRequest {
  /** What is being deleted, shown in bold, e.g. "sweater (PROD-0002)". */
  itemName: string;
  /** Optional extra line, e.g. what else gets deleted with it. */
  note?: string;
  /** Does the delete. Throw to show an error in the window (a wrong password included). */
  run: (password: string) => Promise<void>;
}

interface State {
  request: (DeleteRequest & { id: number }) | null;
  open: (request: DeleteRequest) => void;
  close: () => void;
}

let counter = 0;

export const useConfirmDeleteStore = create<State>((set) => ({
  request: null,
  open: (request) => set({ request: { ...request, id: ++counter } }),
  close: () => set({ request: null }),
}));

/** Call this from any delete button. */
export function requestDelete(request: DeleteRequest) {
  useConfirmDeleteStore.getState().open(request);
}