import { useEffect } from "react";
import { create } from "zustand";
import type { Settings } from "@muzammil-pos/types";
import { settingsApi } from "../services/settings";

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

interface SettingsState {
  settings: Settings | null;
  status: "idle" | "loading" | "ready" | "error";
  load: (force?: boolean) => Promise<void>;
  setSettings: (settings: Settings) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  status: "idle",

  load: async (force = false) => {
    const { status } = get();
    if (!force && (status === "loading" || status === "ready")) return;
    set({ status: "loading" });
    try {
      set({ settings: await settingsApi.get(), status: "ready" });
    } catch {
      set({ status: "error" });
    }
  },

  setSettings: (settings) => set({ settings, status: "ready" }),
}));

/** Loads the settings once; every screen that uses this hook shares the same copy. */
export function useShopSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const status = useSettingsStore((s) => s.status);
  const load = useSettingsStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    settings,
    status,
    reload: () => load(true),
    lowStockThreshold: settings?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,
  };
}