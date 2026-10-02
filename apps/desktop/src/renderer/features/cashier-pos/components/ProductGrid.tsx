import { ImageOff } from "lucide-react";
import { Badge, Card } from "@muzammil-pos/ui";
import { formatCurrency } from "@muzammil-pos/utils";
import type { CashierProduct } from "../../../services/cashier";
import { API_ORIGIN } from "../../../services/http";

interface ProductGridProps {
  products: CashierProduct[];
  isLoading: boolean;
  onSelectProduct: (product: CashierProduct) => void;
}

function totalStock(product: CashierProduct): number {
  return product.variants.reduce((sum, v) => sum + v.quantity, 0);
}

export function ProductGrid({ products, isLoading, onSelectProduct }: ProductGridProps) {
  if (isLoading) {
    return <div className="flex h-40 items-center justify-center text-sm text-gray-400">Loading products…</div>;
  }

  if (products.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-gray-400">
        <p>No products found.</p>
        <p className="text-xs">Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map((product) => {
        const stock = totalStock(product);
        return (
          <Card
            key={product.id}
            className="cursor-pointer p-3 transition-shadow hover:shadow-md"
            onClick={() => onSelectProduct(product)}
          >
            <div className="mb-2 flex h-24 items-center justify-center overflow-hidden rounded-control bg-gray-100 text-gray-300">
              {product.primaryImageUrl ? (
                <img
                  src={`${API_ORIGIN}${product.primaryImageUrl}`}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageOff size={24} />
              )}
            </div>
            <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
            <p className="text-xs text-gray-400">{product.category?.name ?? "—"}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-brand">{formatCurrency(product.basePrice)}</span>
              <Badge tone={stock === 0 ? "danger" : stock < 5 ? "warning" : "neutral"}>{stock} in stock</Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
}