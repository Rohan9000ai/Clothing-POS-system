import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Button, Input, Card } from "@muzammil-pos/ui";
import { useAuthStore } from "../../store/authStore";
import { LanguageSwitch } from "../../components/LanguageSwitch";
import { useT } from "../../i18n/store";

export function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError, user } = useAuthStore();
  const t = useT();

  // Already logged in: go to the right home screen for this role.
  if (user) {
    return <Navigate to={user.role === "ADMIN" ? "/" : "/pos"} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    await login(username.trim(), password);
  }

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-gray-50 p-6">
      <div className="absolute end-4 top-4">
        <LanguageSwitch />
      </div>

      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-xl font-bold text-white">
            M
          </div>
          <h1 className="text-title text-gray-900">مزمل اسٹور</h1>
          <p className="text-sm text-gray-500">{t("Muzammil Store POS")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t("Username")}
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading}
            autoFocus
            required
          />
          <Input
            label={t("Password")}
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />

          {error && (
            <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{t(error)}</div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
            {isLoading ? t("Signing in…") : t("Sign In")}
          </Button>
        </form>
      </Card>
    </div>
  );
}