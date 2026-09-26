import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export function RoleRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ADMIN" ? "/" : "/pos"} replace />;
}