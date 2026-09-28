import { Boxes } from "lucide-react";
import { PlaceholderPage } from "../../components/PlaceholderPage";

export function InventoryScreen() {
  return (
    <PlaceholderPage
      title="Inventory"
      description="Products, sizes, colors and stock levels"
      icon={Boxes}
      plannedFeatures={[
        "Searchable product list with category filter",
        "Add and edit products with sizes, colors, quantity and price",
        "Auto-generated product ID and image upload",
        "Activate or deactivate products",
        "Low stock (below 5) and out-of-stock badges",
        "Delete products that were never sold",
      ]}
    />
  );
}