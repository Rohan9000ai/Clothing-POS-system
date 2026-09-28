import { Truck } from "lucide-react";
import { PlaceholderPage } from "../../components/PlaceholderPage";

export function SuppliersScreen() {
  return (
    <PlaceholderPage
      title="Suppliers"
      description="Supplier accounts and balances"
      icon={Truck}
      plannedFeatures={[
        "Add suppliers with phone, address and opening balance",
        "Directory with total, paid and remaining balance",
        "Record purchases and payments (cash or online transfer)",
        "Full transaction history per supplier",
        "Edit suppliers and toggle active status",
      ]}
    />
  );
}