import type { Salesman, User } from "@muzammil-pos/types";
import type { CreateSalesmanInput, UpdateSalesmanInput } from "@muzammil-pos/validation";
import { apiRequest } from "./http";

export interface SalesmanWithStats extends Salesman {
  user: { id: string; username: string; fullName: string; status: string } | null;
  todaySales: number;
  todaySalesCount: number;
}

export const salesmenAdminApi = {
  async list(): Promise<SalesmanWithStats[]> {
    const res = await apiRequest<{ salesmen: SalesmanWithStats[] }>("/salesmen");
    return res.salesmen;
  },
  async create(input: CreateSalesmanInput): Promise<SalesmanWithStats> {
    const res = await apiRequest<{ salesman: SalesmanWithStats }>("/salesmen", {
      method: "POST",
      body: input,
    });
    return res.salesman;
  },
  async update(id: string, input: UpdateSalesmanInput): Promise<SalesmanWithStats> {
    const res = await apiRequest<{ salesman: SalesmanWithStats }>(`/salesmen/${id}`, {
      method: "PATCH",
      body: input,
    });
    return res.salesman;
  },
  async setStatus(id: string, status: "ACTIVE" | "INACTIVE"): Promise<SalesmanWithStats> {
    const res = await apiRequest<{ salesman: SalesmanWithStats }>(`/salesmen/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
    return res.salesman;
  },
  async remove(id: string): Promise<void> {
    await apiRequest(`/salesmen/${id}`, { method: "DELETE" });
  },
};

/** Cashier-role users not yet linked to any salesman — used to populate the link picker. */
export async function listLinkableCashierUsers(allSalesmen: SalesmanWithStats[]): Promise<User[]> {
  const res = await apiRequest<{ users: User[] }>("/users");
  const linkedUserIds = new Set(allSalesmen.map((s) => s.userId).filter(Boolean));
  return res.users.filter((u) => u.role === "CASHIER" && !linkedUserIds.has(u.id));
}