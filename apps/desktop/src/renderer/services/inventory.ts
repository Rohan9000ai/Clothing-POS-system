import type { Product, ProductVariant, Category, PaginatedResponse } from "@muzammil-pos/types";
import type {
  CreateCategoryInput,
  CreateProductInput,
  UpdateProductInput,
  CreateProductVariantInput,
  UpdateProductVariantInput,
} from "@muzammil-pos/validation";
import { apiRequest, apiUpload } from "./http";

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  status?: string;
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

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const res = await apiRequest<{ categories: Category[] }>("/inventory/categories");
    return res.categories;
  },
  async create(input: CreateCategoryInput): Promise<Category> {
    const res = await apiRequest<{ category: Category }>("/inventory/categories", {
      method: "POST",
      body: input,
    });
    return res.category;
  },
};

export const productsApi = {
    async list(params: ProductListParams = {}): Promise<PaginatedResponse<Product>> {
    return apiRequest<PaginatedResponse<Product>>(`/inventory/products${buildQuery({ ...params })}`);
  },
  async get(id: string): Promise<Product> {
    const res = await apiRequest<{ product: Product }>(`/inventory/products/${id}`);
    return res.product;
  },
  async create(input: CreateProductInput): Promise<Product> {
    const res = await apiRequest<{ product: Product }>("/inventory/products", {
      method: "POST",
      body: input,
    });
    return res.product;
  },
  async update(id: string, input: UpdateProductInput): Promise<Product> {
    const res = await apiRequest<{ product: Product }>(`/inventory/products/${id}`, {
      method: "PATCH",
      body: input,
    });
    return res.product;
  },
  async setStatus(id: string, status: "ACTIVE" | "INACTIVE"): Promise<Product> {
    const res = await apiRequest<{ product: Product }>(`/inventory/products/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
    return res.product;
  },
  async remove(id: string): Promise<void> {
    await apiRequest(`/inventory/products/${id}`, { method: "DELETE" });
  },
};

export const variantsApi = {
  async list(productId: string): Promise<ProductVariant[]> {
    const res = await apiRequest<{ variants: ProductVariant[] }>(
      `/inventory/products/${productId}/variants`
    );
    return res.variants;
  },
  async create(productId: string, input: CreateProductVariantInput): Promise<ProductVariant> {
    const res = await apiRequest<{ variant: ProductVariant }>(
      `/inventory/products/${productId}/variants`,
      { method: "POST", body: input }
    );
    return res.variant;
  },
  async update(
    productId: string,
    variantId: string,
    input: UpdateProductVariantInput
  ): Promise<ProductVariant> {
    const res = await apiRequest<{ variant: ProductVariant }>(
      `/inventory/products/${productId}/variants/${variantId}`,
      { method: "PATCH", body: input }
    );
    return res.variant;
  },
  async setStatus(
    productId: string,
    variantId: string,
    status: "ACTIVE" | "INACTIVE"
  ): Promise<ProductVariant> {
    const res = await apiRequest<{ variant: ProductVariant }>(
      `/inventory/products/${productId}/variants/${variantId}/status`,
      { method: "PATCH", body: { status } }
    );
    return res.variant;
  },
  async remove(productId: string, variantId: string): Promise<void> {
    await apiRequest(`/inventory/products/${productId}/variants/${variantId}`, { method: "DELETE" });
  },
};

export const productImagesApi = {
  async upload(productId: string, files: File[]): Promise<Product> {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));
    const res = await apiUpload<{ product: Product }>(
      `/inventory/products/${productId}/images`,
      formData
    );
    return res.product;
  },
  async remove(productId: string, imageId: string): Promise<Product> {
    const res = await apiRequest<{ product: Product }>(
      `/inventory/products/${productId}/images/${imageId}`,
      { method: "DELETE" }
    );
    return res.product;
  },
  async setPrimary(productId: string, imageId: string): Promise<Product> {
    const res = await apiRequest<{ product: Product }>(
      `/inventory/products/${productId}/images/${imageId}/primary`,
      { method: "PATCH" }
    );
    return res.product;
  },
};