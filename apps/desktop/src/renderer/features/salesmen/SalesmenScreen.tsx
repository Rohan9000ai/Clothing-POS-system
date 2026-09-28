import { UserRound } from "lucide-react";
import { PlaceholderPage } from "../../components/PlaceholderPage";

export function SalesmenScreen() {
  return (
    <PlaceholderPage
      title="Salesmen"
      description="Sales staff and performance"
      icon={UserRound}
      plannedFeatures={[
        "Add salesmen with name, phone, CNIC, join date and salary",
        "Roster with status and today's sales",
        "Phone and CNIC format validation",
        "Edit and deactivate salesmen",
      ]}
    />
  );
}