import type { Salesman } from "@muzammil-pos/types";
import { apiRequest } from "./http";

export const salesmenApi = {
  async listActive(): Promise<Salesman[]> {
    const res = await apiRequest<{ salesmen: Salesman[] }>("/salesmen?status=ACTIVE");
    return res.salesmen;
  },
};