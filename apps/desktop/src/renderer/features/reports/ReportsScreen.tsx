import { BarChart3 } from "lucide-react";
import { PlaceholderPage } from "../../components/PlaceholderPage";

export function ReportsScreen() {
  return (
    <PlaceholderPage
      title="Reports"
      description="Sales, stock and profit/loss reports"
      icon={BarChart3}
      plannedFeatures={[
        "Sales, stock, receivables and payables reports",
        "Combined sales and expenses with profit/loss",
        "Top-selling products and highest sales day",
        "Daily, weekly, monthly and custom date ranges",
        "PDF export for every report",
      ]}
    />
  );
}