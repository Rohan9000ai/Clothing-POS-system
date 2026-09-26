import { useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { AdminDashboardScreen } from "../../features/admin-dashboard/AdminDashboardScreen";
import { LoginScreen } from "../../features/auth/LoginScreen";
import { CashierPosScreen } from "../../features/cashier-pos/CashierPosScreen";
import { ComingSoonScreen } from "../../components/ComingSoonScreen";
import { RequireAuth } from "./RequireAuth";
import { RoleRedirect } from "./RoleRedirect";
import { useAuthStore } from "../../store/authStore";

export function AppRouter() {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // On app start, if a token was persisted from a previous session, verify
  // it's still valid and fetch the fresh user profile.
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />

        {/* Cashier home — no sidebar/topbar shell, full-screen billing UI */}
        <Route
          path="/pos"
          element={
            <RequireAuth allowedRoles={["CASHIER", "ADMIN"]}>
              <CashierPosScreen />
            </RequireAuth>
          }
        />

        {/* Admin shell — sidebar + topbar layout, admin-only */}
        <Route
          element={
            <RequireAuth allowedRoles={["ADMIN"]}>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<AdminDashboardScreen />} />
          <Route path="/inventory" element={<ComingSoonScreen titleKey="Inventory" />} />
          <Route path="/sales" element={<ComingSoonScreen titleKey="Sales" />} />
          <Route path="/suppliers" element={<ComingSoonScreen titleKey="Suppliers" />} />
          <Route path="/salesmen" element={<ComingSoonScreen titleKey="Salesmen" />} />
          <Route path="/expenses" element={<ComingSoonScreen titleKey="Expenses" />} />
          <Route path="/reports" element={<ComingSoonScreen titleKey="Reports" />} />
          <Route path="/users" element={<ComingSoonScreen titleKey="Users" />} />
          <Route path="/settings" element={<ComingSoonScreen titleKey="Settings" />} />
        </Route>

        {/* Any unmatched path — send logged-in users home by role, others to login */}
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </HashRouter>
  );
}