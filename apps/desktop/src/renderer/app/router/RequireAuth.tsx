import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import type { UserRole } from "@muzammil-pos/types";

interface RequireAuthProps {
  children: ReactNode;
  /** If provided, only these roles may view this route. */
  allowedRoles?: UserRole[];
}

/**
 * Guards a route: redirects to /login if not authenticated, or to the
 * correct home screen for the user's role if they're logged in but not
 * permitted on this specific route (e.g. a cashier hitting an admin page).
 */
export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const homePath = user.role === "ADMIN" ? "/" : "/pos";
    return <Navigate to={homePath} replace />;
  }

  return <>{children}</>;
}