import { Card } from "@muzammil-pos/ui";
import { BackupPanel } from "./BackupPanel";

export function SettingsScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-title text-gray-900">Settings</h2>
        <p className="text-sm text-gray-400">Backups, receipt and stock alerts</p>
      </div>

      <BackupPanel />

      <Card>
        <h3 className="text-section text-gray-900">Receipt, stock alerts and language</h3>
        <p className="mt-1 text-sm text-gray-400">
          Receipt header/footer with live preview, the low-stock threshold and the English/Urdu switch are built in a
          later step.
        </p>
      </Card>
    </div>
  );
}