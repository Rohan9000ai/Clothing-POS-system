import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, X } from "lucide-react";
import { backupsApi, type BackupStatus } from "../../services/backups";

export function BackupWarning() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      backupsApi
        .status()
        .then((s) => {
          if (!cancelled) setStatus(s);
        })
        .catch(() => {
          // A failed check must never get in the way of working.
        });

    void load();
    const timer = setInterval(load, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!status || dismissed) return null;

  // Missing or old backups are urgent. Having no second copy is a reminder.
  const message = status.isStale
    ? status.lastBackupAt
      ? "No recent backup. Automatic backups may not be working."
      : "No backup has been made yet."
    : !status.secondaryConfigured
      ? "Your backups are only on this computer. Add a USB drive or cloud folder so they survive a reinstall."
      : null;

  if (!message) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-warning/30 bg-warning-light px-6 py-2 text-sm text-warning">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className="shrink-0" />
        <span>{message}</span>
        <Link to="/settings" className="font-medium underline">
          Open backup settings
        </Link>
      </div>
      <button onClick={() => setDismissed(true)} className="rounded p-1 hover:bg-white/50" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}