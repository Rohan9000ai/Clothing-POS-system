import { useAuthStore } from "../../store/authStore";
import { Card, Button } from "@muzammil-pos/ui";

export function CashierPosScreen() {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">NexaPOS Register — Muzammil Store</h1>
          <p className="text-xs text-gray-400">Cashier: {user?.fullName}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => logout()}>
          Logout
        </Button>
      </header>

      <main className="flex flex-1 items-center justify-center p-12">
        <Card className="max-w-md text-center">
          <p className="text-sm font-semibold text-gray-800">Cashier billing screen</p>
          <p className="mt-1 text-sm text-gray-400">
            This screen is scaffolded — full billing build-out coming soon.
          </p>
        </Card>
      </main>
    </div>
  );
}