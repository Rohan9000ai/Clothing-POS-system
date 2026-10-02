import { useState } from "react";
import clsx from "clsx";
import { Button, Modal } from "@muzammil-pos/ui";
import { formatCurrency } from "@muzammil-pos/utils";
import type { CashierProduct, CashierProductVariant } from "../../../services/cashier";
import { useCartStore } from "../../../store/cartStore";

interface AddToCartModalProps {
  product: CashierProduct;
  onClose: () => void;
}

export function AddToCartModal({ product, onClose }: AddToCartModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  const [selectedVariant, setSelectedVariant] = useState<CashierProductVariant | null>(
    product.variants.length === 1 ? (product.variants[0] ?? null) : null
  );
  const [quantity, setQuantity] = useState(1);

  const alreadyInCart = selectedVariant
    ? (cartItems.find((i) => i.variantId === selectedVariant.id)?.quantity ?? 0)
    : 0;
  const remainingStock = selectedVariant ? selectedVariant.quantity - alreadyInCart : 0;

  function handleAdd() {
    if (!selectedVariant || quantity < 1 || quantity > remainingStock) return;
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productName: product.name,
      size: selectedVariant.size,
      color: selectedVariant.color,
      unitPrice: selectedVariant.priceOverride ?? product.basePrice,
      availableStock: selectedVariant.quantity,
      quantity,
    });
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={product.name}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedVariant || quantity < 1 || quantity > remainingStock}
          >
            Add to cart
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Select size / color
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const inCart = cartItems.find((i) => i.variantId === v.id)?.quantity ?? 0;
              const available = v.quantity - inCart;
              const isSelected = selectedVariant?.id === v.id;
              const isOut = available <= 0;
              return (
                <button
                  key={v.id}
                  disabled={isOut}
                  onClick={() => {
                    setSelectedVariant(v);
                    setQuantity(1);
                  }}
                  className={clsx(
                    "rounded-control border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    isSelected
                      ? "border-brand bg-brand-light text-brand"
                      : "border-gray-300 text-gray-700 hover:border-brand"
                  )}
                >
                  <span className="font-medium">
                    {v.size} / {v.color}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {isOut ? "Out of stock" : `${available} in stock`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedVariant && (
          <>
            <div className="flex items-center justify-between rounded-control bg-gray-50 px-3 py-2 text-sm">
              <span className="text-gray-500">Price</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(selectedVariant.priceOverride ?? product.basePrice)}
              </span>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-700">Quantity</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-8 w-8 rounded-control border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={remainingStock}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-16 rounded-control border border-gray-300 px-2 py-1.5 text-center text-sm"
                />
                <button
                  onClick={() => setQuantity((q) => Math.min(remainingStock, q + 1))}
                  disabled={quantity >= remainingStock}
                  className="h-8 w-8 rounded-control border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                >
                  +
                </button>
                <span className="text-xs text-gray-400">{remainingStock} available</span>
              </div>
              {quantity > remainingStock && (
                <p className="mt-1 text-xs text-danger">Only {remainingStock} in stock.</p>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}