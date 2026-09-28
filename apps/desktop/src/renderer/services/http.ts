import { useAuthStore } from "../store/authStore";
import { ApiRequestError } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4310/api";

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

  if (!res.ok) {
    let errorBody: { error?: { code?: string; category?: string; message?: string; details?: Record<string, unknown> } } = {};
    try {
      errorBody = await res.json();
    } catch {
      // non-JSON error response — fall through to generic message
    }
    const err = errorBody.error;

    if (res.status === 401 && err?.code === "SESSION_EXPIRED") {
      useAuthStore.setState({ token: null, user: null });
    }

    throw new HttpError(
      err?.message ?? `Request failed with status ${res.status}`,
      res.status,
      err?.code,
      err?.category,
      err?.details
    );
  }

  return res.json() as Promise<T>;
}