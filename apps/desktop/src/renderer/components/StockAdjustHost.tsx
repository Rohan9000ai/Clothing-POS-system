import { useStockAdjustStore } from "../store/stockAdjustStore";
import { StockAdjustModal } from "./StockAdjustModal";

export function StockAdjustHost() {
  const request = useStockAdjustStore((s) => s.request);
  const close = useStockAdjustStore((s) => s.close);
  if (!request) return null;

  return (
    <StockAdjustModal
      key={request.id}
      label={request.label}
      currentQuantity={request.currentQuantity}
      onClose={close}
      onSubmit={request.run}
    />
  );
}