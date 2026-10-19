import type { Settings } from "@muzammil-pos/types";
import type { UpdateSettingsInput } from "@muzammil-pos/validation";
import { apiRequest } from "./http";

export const settingsApi = {
  async get(): Promise<Settings> {
    const res = await apiRequest<{ settings: Settings }>("/settings");
    return res.settings;
  },
  async update(input: UpdateSettingsInput): Promise<Settings> {
    const res = await apiRequest<{ settings: Settings }>("/settings", { method: "PUT", body: input });
    return res.settings;
  },
};