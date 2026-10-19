import { Card } from "@muzammil-pos/ui";
import { BackupPanel } from "./BackupPanel";
import { ReceiptSettingsPanel } from "./ReceiptSettingsPanel";

export function SettingsScreen() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-title text-gray-900">Settings</h2>
        <p className="text-sm text-gray-400">Receipts, tax, stock alerts and backups</p>
      </div>

      <ReceiptSettingsPanel />
      <BackupPanel />

      <Card>
        <h3 className="text-section text-gray-900">Language</h3>
        <p className="mt-1 text-sm text-gray-400">
          The English / Urdu switch for the whole app is built in the Urdu step.
        </p>
      </Card>
    </div>
  );
}