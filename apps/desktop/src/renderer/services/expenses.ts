import type {
  Expense,
  ExpenseStatus,
  ExpenseType,
  PaginatedResponse,
  PayoutMethod,
} from "@muzammil-pos/types";
import type { CreateExpenseInput, UpdateExpenseInput, VoidExpenseInput } from "@muzammil-pos/validation";
import { apiRequest } from "./http";

export interface ExpenseDetail extends Expense {
  supplier: { id: string; name: string } | null;
  salesman: { id: string; name: string } | null;
  createdBy: { id: string; fullName: string; username: string };
}

export interface ExpenseListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: ExpenseType;
  paymentMethod?: PayoutMethod;
  status?: ExpenseStatus;
  /** ISO timestamps, e.g. 2026-10-01T00:00:00.000Z */
  dateFrom?: string;
  dateTo?: string;
}

export interface ExpenseListResponse extends PaginatedResponse<ExpenseDetail> {
  /** Total of ACTIVE (non-voided) expenses matching the filters, across all pages. */
  summary: { activeTotal: number };
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

async function listExpenses(params: ExpenseListParams = {}): Promise<ExpenseListResponse> {
  return apiRequest<ExpenseListResponse>(`/expenses${buildQuery({ ...params })}`);
}

export const expensesApi = {
  list: listExpenses,

  /** Fetches every page for the given filters. Used by the PDF export. */
  async listAll(params: Omit<ExpenseListParams, "page" | "pageSize">): Promise<ExpenseDetail[]> {
    const all: ExpenseDetail[] = [];
    let page = 1;
    for (;;) {
      const res = await listExpenses({ ...params, page, pageSize: 100 });
      all.push(...res.items);
      if (res.items.length === 0 || page >= res.meta.totalPages) break;
      page++;
    }
    return all;
  },

  async create(input: CreateExpenseInput): Promise<ExpenseDetail> {
    const res = await apiRequest<{ expense: ExpenseDetail }>("/expenses", { method: "POST", body: input });
    return res.expense;
  },

  async update(id: string, input: UpdateExpenseInput): Promise<ExpenseDetail> {
    const res = await apiRequest<{ expense: ExpenseDetail }>(`/expenses/${id}`, {
      method: "PATCH",
      body: input,
    });
    return res.expense;
  },

  async void(id: string, input: VoidExpenseInput): Promise<ExpenseDetail> {
    const res = await apiRequest<{ expense: ExpenseDetail }>(`/expenses/${id}/void`, {
      method: "POST",
      body: input,
    });
    return res.expense;
  },
};