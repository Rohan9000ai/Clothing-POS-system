import type { Settings } from "@muzammil-pos/types";
import { apiRequest } from "./http";

export const settingsApi = {
  async get(): Promise<Settings> {
    const res = await apiRequest<{ settings: Settings }>("/settings");
    return res.settings;
  },
};