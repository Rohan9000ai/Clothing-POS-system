import { useAuthStore } from "../store/authStore";
import { ApiRequestError } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4310/api";

/** Origin only (no /api suffix) — used to build full URLs for uploaded files like product images. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

/** Error thrown for any failed API call. Carries HTTP status and server details (e.g. field errors). */
export class HttpError extends ApiRequestError {
  status: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    category?: string,
    details?: Record<string, unknown>
  ) {
    super(message, code, category);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

async function resolveError(res: Response): Promise<HttpError> {
  let errorBody: {
    error?: { code?: string; category?: string; message?: string; details?: Record<string, unknown> };
  } = {};
  try {
    errorBody = await res.json();
  } catch {
    // non-JSON error response — fall through to generic message
  }
  const err = errorBody.error;

  if (res.status === 401 && err?.code === "SESSION_EXPIRED") {
    useAuthStore.setState({ token: null, user: null });
  }

  return new HttpError(
    err?.message ?? `Request failed with status ${res.status}`,
    res.status,
    err?.code,
    err?.category,
    err?.details
  );
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
}

/**
 * Authenticated JSON request helper. Attaches the Bearer token from the
 * auth store, and clears the session if the server says it has expired
 * (RequireAuth then redirects to /login).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;
  const token = useAuthStore.getState().token;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new HttpError(
      "Could not reach the server. Make sure the app is fully started and try again.",
      0,
      "NETWORK_ERROR",
      "SYSTEM"
    );
  }

  if (!res.ok) throw await resolveError(res);
  return res.json() as Promise<T>;
}

/**
 * Authenticated multipart upload helper (used for product images). Content-Type
 * is deliberately NOT set — the browser sets the correct multipart boundary
 * automatically when given a FormData body; setting it manually breaks uploads.
 */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = useAuthStore.getState().token;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
  } catch {
    throw new HttpError(
      "Could not reach the server. Make sure the app is fully started and try again.",
      0,
      "NETWORK_ERROR",
      "SYSTEM"
    );
  }

  if (!res.ok) throw await resolveError(res);
  return res.json() as Promise<T>;
}