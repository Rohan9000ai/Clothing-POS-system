import type { UserRole, Status } from "@muzammil-pos/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4310/api";

export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  status: Status;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface ApiErrorBody {
  error: {
    category: string;
    code: string;
    messageKey: string;
    message: string;
  };
}

/** Thrown on any failed API call, carrying the parsed error body when available. */
export class ApiRequestError extends Error {
  code?: string;
  category?: string;

  constructor(message: string, code?: string, category?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.category = category;
  }
}

async function parseErrorResponse(res: Response): Promise<ApiRequestError> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return new ApiRequestError(body.error.message, body.error.code, body.error.category);
  } catch {
    return new ApiRequestError(`Request failed with status ${res.status}`);
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  const data = await res.json();
  return data.user;
}

export async function logoutRequest(token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {
    // Logout is best-effort on the server side — the client always clears
    // its local session regardless (see authStore.logout()).
  });
}