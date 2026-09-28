import { Receipt } from "lucide-react";
import { PlaceholderPage } from "../../components/PlaceholderPage";

export function SalesScreen() {
  return (
    <PlaceholderPage
      title="Sales"
      description="Invoices, payments and sales history"
      icon={Receipt}
      plannedFeatures={[
        "All invoices with bill no, date, salesman, customer and net total",
        "Search and filter by date and payment status",
        "View invoice details and reprint receipts",
        "Void a sale (stock is returned automatically)",
        "Summary cards for volume, receipts and unpaid bills",
      ]}
    />
  );
}