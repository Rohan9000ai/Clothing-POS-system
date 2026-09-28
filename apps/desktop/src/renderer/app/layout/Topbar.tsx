import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, ShoppingCart } from "lucide-react";
import clsx from "clsx";
import { Button } from "@muzammil-pos/ui";
import { useAuthStore } from "../../store/authStore";
import { useApiHealth, type ConnectionState } from "../../hooks/useApiHealth";
import { findNavItem } from "./navConfig";

const STATUS_PILL: Record<ConnectionState, { label: string; pill: string; dot: string }> = {
  connecting: { label: "Checking…", pill: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
  connected: { label: "System online", pill: "bg-success-light text-success", dot: "bg-success" },
  degraded: { label: "Database issue", pill: "bg-warning-light text-warning", dot: "bg-warning" },
  error: { label: "API offline", pill: "bg-danger-light text-danger", dot: "bg-danger" },
};

export function Topbar() {
  const [now, setNow] = useState(new Date());
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { state, health, errorMessage } = useApiHealth();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const page = findNavItem(pathname);
  const status = STATUS_PILL[state];

  const statusTooltip =
    state === "connected"
      ? `${health?.app} · database ${health?.checks.database.status}`
      : state === "degraded"
        ? `Database check failed: ${health?.checks.database.message ?? "unknown error"}`
        : state === "error"
          ? (errorMessage ?? "Could not reach the API")
          : "Checking connection…";

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  const initials = user?.fullName
    ?.split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <p className="text-[11px] font-medium text-gray-400">مزمل اسٹور — Muzammil Store</p>
        <h1 className="text-base font-semibold leading-tight text-gray-900">{page?.label ?? "Admin"}</h1>
      </div>

      <div className="flex items-center gap-4">
        <span
          title={statusTooltip}
          className={clsx(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
            status.pill
          )}
        >
          <span className={clsx("h-2 w-2 rounded-full", status.dot)} />
          {status.label}
        </span>

        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarDays size={14} />
          {formattedDate} · {formattedTime}
        </span>

        {/* Quick action */}
        <Button size="sm" onClick={() => navigate("/pos")}>
          <ShoppingCart size={15} />
          New sale
        </Button>

        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">
            {initials ?? "A"}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-gray-800">{user?.fullName ?? "Admin"}</p>
            <p className="text-[11px] text-gray-400">
              {user?.role === "ADMIN" ? "Administrator" : "Cashier"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}