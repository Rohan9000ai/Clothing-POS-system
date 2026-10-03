import { useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { AdminDashboardScreen } from "../../features/admin-dashboard/AdminDashboardScreen";
import { InventoryScreen } from "../../features/inventory/InventoryScreen";
import { SalesScreen } from "../../features/sales/SalesScreen";
import { SuppliersScreen } from "../../features/suppliers/SuppliersScreen";
import { SalesmenScreen } from "../../features/salesmen/SalesmenScreen";
import { ExpensesScreen } from "../../features/expenses/ExpensesScreen";
import { ReportsScreen } from "../../features/reports/ReportsScreen";
import { UsersScreen } from "../../features/users/UsersScreen";
import { SettingsScreen } from "../../features/settings/SettingsScreen";
import { LoginScreen } from "../../features/auth/LoginScreen";
import { CashierPosScreen } from "../../features/cashier-pos/CashierPosScreen";
import { RequireAuth } from "./RequireAuth";
import { RoleRedirect } from "./RoleRedirect";
import { useAuthStore } from "../../store/authStore";
import { InvoiceScreen } from "../../features/invoice/InvoiceScreen";

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

        {/* Cashier home: full-screen billing UI, no sidebar/topbar shell */}
        <Route
          path="/pos"
          element={
            <RequireAuth allowedRoles={["CASHIER", "ADMIN"]}>
              <CashierPosScreen />
            </RequireAuth>
          }
        />

        <Route
          path="/invoice/:saleId"
          element={
            <RequireAuth allowedRoles={["CASHIER", "ADMIN"]}>
              <InvoiceScreen />
            </RequireAuth>
          }
        />

        {/* Admin shell: sidebar + topbar, admin-only */}
        <Route
          element={
            <RequireAuth allowedRoles={["ADMIN"]}>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<AdminDashboardScreen />} />
          <Route path="/inventory" element={<InventoryScreen />} />
          <Route path="/sales" element={<SalesScreen />} />
          <Route path="/suppliers" element={<SuppliersScreen />} />
          <Route path="/salesmen" element={<SalesmenScreen />} />
          <Route path="/expenses" element={<ExpensesScreen />} />
          <Route path="/reports" element={<ReportsScreen />} />
          <Route path="/users" element={<UsersScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>

        {/* Any unmatched path: send logged-in users home by role, others to login */}
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </HashRouter>
  );
}