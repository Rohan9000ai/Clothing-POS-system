import type { Category } from "@muzammil-pos/types";
import type { CreateCategoryInput } from "@muzammil-pos/validation";
import { apiRequest } from "./http";

export interface CategoryWithCount extends Category {
  productCount: number;
}

export const categoryAdminApi = {
  async list(): Promise<CategoryWithCount[]> {
    const res = await apiRequest<{ categories: CategoryWithCount[] }>("/inventory/categories");
    return res.categories;
  },
  async create(input: CreateCategoryInput): Promise<Category> {
    const res = await apiRequest<{ category: Category }>("/inventory/categories", { method: "POST", body: input });
    return res.category;
  },
  async rename(id: string, name: string): Promise<Category> {
    const res = await apiRequest<{ category: Category }>(`/inventory/categories/${id}`, {
      method: "PATCH",
      body: { name },
    });
    return res.category;
  },
  async setStatus(id: string, status: "ACTIVE" | "INACTIVE"): Promise<Category> {
    const res = await apiRequest<{ category: Category }>(`/inventory/categories/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
    return res.category;
  },
  async remove(id: string, password: string): Promise<void> {
    await apiRequest(`/inventory/categories/${id}`, { method: "DELETE", body: { password } });
  },
};