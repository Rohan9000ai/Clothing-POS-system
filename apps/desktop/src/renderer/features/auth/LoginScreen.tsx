import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Button, Input, Card } from "@muzammil-pos/ui";
import { useAuthStore } from "../../store/authStore";

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError, user } = useAuthStore();

  // Already logged in (e.g. session restored, or just logged in) — leave
  // the login screen and go to the correct home for this role.
  if (user) {
    return <Navigate to={user.role === "ADMIN" ? "/" : "/pos"} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    await login(username.trim(), password);
    // No manual navigation here — once `login()` sets `user` in the store,
    // this component re-renders and the `if (user)` check above redirects.
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 p-6">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-xl font-bold text-white">
            M
          </div>
          <h1 className="text-title text-gray-900">مزمل اسٹور</h1>
          <p className="text-sm text-gray-500">Muzammil Store POS</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            autoFocus
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />

          {error && (
            <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
            {isLoading ? "Signing in…" : "Sign In"}
          </Button>
        </form>
      </Card>
    </div>
  );
}