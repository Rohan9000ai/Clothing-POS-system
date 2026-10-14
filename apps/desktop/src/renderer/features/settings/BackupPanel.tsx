import { useCallback, useEffect, useState } from "react";
import { DatabaseBackup, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, Table, type TableColumn } from "@muzammil-pos/ui";
import { formatDateTime } from "@muzammil-pos/utils";
import { backupsApi, type BackupInfo, type BackupStatus } from "../../services/backups";
import { useToastStore } from "../../store/toastStore";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function timeAgo(hours: number): string {
  if (hours < 1) return "less than an hour ago";
  if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function BackupPanel() {
  const push = useToastStore((s) => s.push);

  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await backupsApi.status());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load backup information.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleBackupNow() {
    setIsBackingUp(true);
    try {
      const backup = await backupsApi.create();
      if (backup.secondary.configured && !backup.secondary.ok) {
        push("error", "Backup saved on this computer, but the second copy failed. Check that the USB drive or folder is available.");
      } else {
        push("success", "Backup completed and verified.");
      }
      await load();
    } catch (err) {
      push("error", err instanceof Error ? err.message : "The backup failed. Please try again.");
    } finally {
      setIsBackingUp(false);
    }
  }

  const columns: TableColumn<BackupInfo>[] = [
    { header: "Date & time", render: (b) => <span className="text-gray-700">{formatDateTime(b.createdAt)}</span> },
    {
      header: "Type",
      render: (b) => (
        <Badge tone={b.trigger === "MANUAL" ? "brand" : "neutral"}>
          {b.trigger === "MANUAL" ? "Manual" : b.trigger === "AUTO" ? "Automatic" : "Unknown"}
        </Badge>
      ),
    },
    { header: "Database", className: "text-right", render: (b) => formatBytes(b.databaseBytes) },
    {
      header: "Pictures",
      className: "text-right",
      render: (b) => `${b.uploadFiles} (${formatBytes(b.uploadBytes)})`,
    },
    {
      header: "Check",
      render: (b) =>
        b.integrity === "ok" ? <Badge tone="success">Verified</Badge> : <Badge tone="danger">Problem</Badge>,
    },
    {
      header: "Second copy",
      render: (b) =>
        !b.secondary.configured ? (
          <span className="text-gray-300">—</span>
        ) : b.secondary.ok ? (
          <Badge tone="success">Saved</Badge>
        ) : (
          <span title={b.secondary.error}>
            <Badge tone="danger">Failed</Badge>
          </span>
        ),
    },
  ];

  const newestBackup = status?.backups[0];
  const newestSecondaryFailed = !!newestBackup && newestBackup.secondary.configured && !newestBackup.secondary.ok;
  const healthy = !!status && !status.isStale && status.secondaryConfigured && !newestSecondaryFailed;

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-light text-brand">
            <DatabaseBackup size={20} />
          </div>
          <div>
            <h3 className="text-section text-gray-900">Data safety & backups</h3>
            <p className="text-xs text-gray-400">
              Stock, sales, supplier balances and product pictures, protected against crashes and reinstalls
            </p>
          </div>
        </div>
        <Button onClick={handleBackupNow} isLoading={isBackingUp} disabled={isLoading || !!loadError}>
          Back up now
        </Button>
      </div>

      {isLoading && <p className="py-6 text-center text-sm text-gray-400">Loading…</p>}
      {loadError && <p className="py-6 text-center text-sm text-danger">{loadError}</p>}

      {status && (
        <>
          <div
            className={`flex items-start gap-3 rounded-control px-4 py-3 text-sm ${
              healthy ? "bg-success-light text-success" : "bg-warning-light text-warning"
            }`}
          >
            {healthy ? <ShieldCheck size={18} className="mt-0.5 shrink-0" /> : <ShieldAlert size={18} className="mt-0.5 shrink-0" />}
            <div>
              {status.lastBackupAt && status.hoursSinceLast !== null ? (
                <p className="font-medium">
                  Last backup {timeAgo(status.hoursSinceLast)} ({formatDateTime(status.lastBackupAt)})
                </p>
              ) : (
                <p className="font-medium">No backup has been made yet. Press "Back up now".</p>
              )}
              {status.isStale && status.lastBackupAt && (
                <p className="mt-0.5 text-xs">
                  Automatic backups should happen every {status.intervalHours} hours. Check the API log for errors.
                </p>
              )}
              {!status.secondaryConfigured && (
                <p className="mt-0.5 text-xs">
                  Backups are only on this computer. If it is reinstalled or the disk fails, they are lost too. Set a
                  second location below.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs text-gray-500 md:grid-cols-2">
            <div className="rounded-control border border-gray-200 p-3">
              <p className="font-medium text-gray-700">Saved on this computer</p>
              <p className="mt-1 break-all font-mono text-[11px]">{status.backupDir}</p>
              <p className="mt-1 text-gray-400">
                Automatic every {status.intervalHours} hours · the last {status.keepCount} are kept
              </p>
            </div>
            <div className="rounded-control border border-gray-200 p-3">
              <p className="font-medium text-gray-700">Second copy (cloud or another drive)</p>
              {status.secondaryConfigured ? (
                <div className="mt-1 space-y-0.5">
                  {status.rcloneRemote && (
                    <p className="break-all font-mono text-[11px]">Cloud: {status.rcloneRemote}</p>
                  )}
                  {status.secondaryDir && (
                    <p className="break-all font-mono text-[11px]">Folder: {status.secondaryDir}</p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-warning">
                  Not set up. In <span className="font-mono">apps/api/.env</span> set{" "}
                  <span className="font-mono">BACKUP_RCLONE_REMOTE</span> (Google Drive via rclone) or{" "}
                  <span className="font-mono">BACKUP_SECONDARY_DIR</span> (a synced or USB folder), then restart the
                  app.
                </p>
              )}
            </div>
          </div>

          {newestSecondaryFailed && (
            <div className="rounded-control bg-danger-light px-4 py-2 text-xs text-danger">
              The newest backup is saved on this computer but could not be copied to the second location:{" "}
              {newestBackup?.secondary.error ?? "unknown error"}. It is retried automatically every hour.
            </div>
          )}

          <Table
            columns={columns}
            data={status.backups}
            keyExtractor={(b) => b.name}
            emptyMessage="No backups yet."
          />

          <details className="rounded-control border border-gray-200 px-3 py-2 text-xs text-gray-500">
            <summary className="cursor-pointer font-medium text-gray-700">How to restore a backup</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Close the app and stop the API (Ctrl+C in its terminal).</li>
              <li>
                In the project folder run <span className="font-mono">npm run db:restore</span> to see the list.
              </li>
              <li>
                Run <span className="font-mono">npm run db:restore -- &lt;backup name&gt;</span> and type RESTORE.
              </li>
              <li>Start the API and the app again.</li>
            </ol>
            <p className="mt-2">
              Your current data is saved first, so a restore can be undone. From a USB drive, give the full path of the
              backup folder instead of its name.
            </p>
          </details>
        </>
      )}
    </Card>
  );
}