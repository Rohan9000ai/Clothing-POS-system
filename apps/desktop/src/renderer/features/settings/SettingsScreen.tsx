import { Settings } from "lucide-react";
import { PlaceholderPage } from "../../components/PlaceholderPage";

export function SettingsScreen() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Receipt, stock alerts and backups"
      icon={Settings}
      plannedFeatures={[
        "Shop name, receipt header and footer with live preview",
        "Low stock threshold (default 5)",
        "Backup now and restore from backup",
        "Language: English / Urdu",
      ]}
    />
  );
}