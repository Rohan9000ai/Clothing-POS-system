import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Card, Button } from "@muzammil-pos/ui";

export function CashierPosScreen() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Register — Muzammil Store</h1>
          <p className="text-xs text-gray-400">Cashier: {user?.fullName}</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "ADMIN" && (
            <Button variant="secondary" size="sm" onClick={() => navigate("/")}>
              Back to admin
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-12">
        <Card className="max-w-md text-center">
          <p className="text-sm font-semibold text-gray-800">Cashier billing screen</p>
          <p className="mt-1 text-sm text-gray-400">
            This screen is scaffolded. Full billing build-out is coming soon.
          </p>
        </Card>
      </main>
    </div>
  );
}