import { HashRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { AdminDashboardScreen } from "../../features/admin-dashboard/AdminDashboardScreen";
import { ComingSoonScreen } from "../../components/ComingSoonScreen";

/**
 * HashRouter (not BrowserRouter) is used because this app is loaded from a
 * local file:// path in production Electron builds, where server-style
 * history routing doesn't work.
 *
 * No auth/role guarding yet — that's Day 5 (Login & role routing). This is
 * just the navigable shell so the layout and API connection can be verified.
 */
export function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
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
      </Routes>
    </HashRouter>
  );
}