import { useEffect, useState } from "react";
import { Badge, Modal } from "@muzammil-pos/ui";
import { formatCurrency, formatDate } from "@muzammil-pos/utils";
import type { Supplier } from "@muzammil-pos/types";
import { suppliersApi, type SupplierDetail } from "../../services/suppliers";

interface SupplierDetailModalProps {
  supplier: Supplier;
  onClose: () => void;
}

const TXN_TONE: Record<string, "success" | "warning" | "neutral"> = {
  PURCHASE: "warning",
  PAYMENT: "success",
  ADJUSTMENT: "neutral",
};

export function SupplierDetailModal({ supplier, onClose }: SupplierDetailModalProps) {
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    suppliersApi
      .get(supplier.id)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load supplier details.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplier.id]);

  return (
    <Modal isOpen onClose={onClose} title={supplier.name} size="lg">
      {isLoading && <p className="py-8 text-center text-sm text-gray-400">Loading…</p>}
      {loadError && <p className="py-8 text-center text-sm text-danger">{loadError}</p>}

      {detail && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <BalanceStat label="Total balance" value={detail.balance.totalBalance} />
            <BalanceStat label="Given (paid)" value={detail.balance.givenBalance} tone="success" />
            <BalanceStat
              label="Remaining"
              value={detail.balance.remainingBalance}
              tone={detail.balance.remainingBalance > 0 ? "danger" : "success"}
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-gray-500">
            <div>Opening: {formatCurrency(detail.balance.openingBalance)}</div>
            <div>Purchases: {formatCurrency(detail.balance.totalPurchases)}</div>
            <div>Adjustments: {formatCurrency(detail.balance.totalAdjustments)}</div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Transaction history
            </p>
            {detail.transactions.length === 0 ? (
              <p className="rounded-control border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400">
                No transactions recorded yet.
              </p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {detail.transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between rounded-control border border-gray-200 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={TXN_TONE[txn.type] ?? "neutral"}>{txn.type}</Badge>
                        <span className="text-xs text-gray-400">{formatDate(txn.date)}</span>
                      </div>
                      {txn.notes && <p className="mt-1 text-xs text-gray-500">{txn.notes}</p>}
                      <p className="text-xs text-gray-400">
                        {txn.paymentMethod.replace("_", " ")}
                        {txn.referenceNo ? ` · ${txn.referenceNo}` : ""} · by {txn.createdBy.fullName}
                      </p>
                    </div>
                    <span
                      className={`font-medium ${txn.amount < 0 ? "text-success" : "text-gray-900"}`}
                    >
                      {txn.amount < 0 ? "−" : ""}
                      {formatCurrency(Math.abs(txn.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function BalanceStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "success" | "danger" | "neutral";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-gray-900";
  return (
    <div className="rounded-control border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{formatCurrency(value)}</p>
    </div>
  );
}