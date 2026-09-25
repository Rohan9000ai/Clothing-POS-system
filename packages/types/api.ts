/**
 * Shared API response shapes — matches the envelope produced by
 * apps/api/src/common/error-handler.middleware.ts and used across every
 * fetch call in the renderer.
 */

export interface ApiErrorBody {
  error: {
    category: "INPUT" | "BUSINESS" | "AUTH" | "HARDWARE" | "SYSTEM";
    code: string;
    messageKey: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}