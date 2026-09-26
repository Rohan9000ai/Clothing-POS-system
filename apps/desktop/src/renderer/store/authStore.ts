import { create } from "zustand";
import { persist } from "zustand/middleware";
import { login as loginRequest, logoutRequest, fetchCurrentUser } from "../services/auth";
import type { AuthUser } from "../services/auth";
import { ApiRequestError } from "../services/auth";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const result = await loginRequest(username, password);
          set({ token: result.token, user: result.user, isLoading: false, error: null });
          return true;
        } catch (err) {
          const message =
            err instanceof ApiRequestError
              ? err.message
              : "Could not reach the server. Please check your connection and try again.";
          set({ isLoading: false, error: message, token: null, user: null });
          return false;
        }
      },

      logout: async () => {
        const { token } = get();
        if (token) {
          await logoutRequest(token);
        }
        set({ token: null, user: null, error: null });
      },

      restoreSession: async () => {
        const { token } = get();
        if (!token) return;

        set({ isLoading: true });
        try {
          const user = await fetchCurrentUser(token);
          set({ user, isLoading: false });
        } catch {
          // Token expired/invalid — clear the stale session rather than
          // leaving the app in a half-authenticated state.
          set({ token: null, user: null, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "muzammil-pos-auth",
      // Only persist the token — user profile is always re-fetched via
      // restoreSession() on app start, so it can't go stale (e.g. role
      // changed by an admin while this session was still open elsewhere).
      partialize: (state) => ({ token: state.token }),
    }
  )
);