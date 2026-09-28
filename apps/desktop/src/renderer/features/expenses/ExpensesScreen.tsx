import { Wallet } from "lucide-react";
import { PlaceholderPage } from "../../components/PlaceholderPage";

export function ExpensesScreen() {
  return (
    <PlaceholderPage
      title="Expenses"
      description="Record and review shop expenses"
      icon={Wallet}
      plannedFeatures={[
        "Add expenses: electricity, salaries, payouts, supplier payments, taxes, other",
        "Payment method: cash or online transfer",
        "History with day, week, month and custom date filters",
        "Edit and void expenses",
        "Print expense report as PDF",
      ]}
    />
  );
}