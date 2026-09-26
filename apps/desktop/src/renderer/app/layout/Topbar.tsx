import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export function Topbar() {
  const [now, setNow] = useState(new Date());
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  const formattedDate = now.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const formattedTime = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const initials = user?.fullName
    ?.split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h1 className="text-base font-semibold text-gray-900">مزمل اسٹور — Muzammil Store</h1>
        <p className="text-xs text-gray-400">POS Admin Console</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500">
          {formattedDate} · {formattedTime}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
            {initials ?? "A"}
          </div>
          <span className="text-sm font-medium text-gray-700">{user?.fullName ?? "Admin"}</span>
        </div>
        <button
          onClick={() => logout()}
          title="Logout"
          className="rounded-control p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}