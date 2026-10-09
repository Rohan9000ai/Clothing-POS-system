import { useCallback, useEffect, useState } from "react";
import { Ban, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Modal } from "@muzammil-pos/ui";
import { formatCurrency, formatDate } from "@muzammil-pos/utils";
import type { Supplier } from "@muzammil-pos/types";
import { voidSupplierPurchaseSchema } from "@muzammil-pos/validation";
import { suppliersApi, type SupplierDetail } from "../../services/suppliers";
import { supplierPurchasesApi, type SupplierPurchaseDetail } from "../../services/supplierPurchases";
import { useToastStore } from "../../store/toastStore";

interface SupplierDetailModalProps {
  supplier: Supplier;
  onClose: () => void;
  onRecordPurchase: () => void;
  /** Called after something changed here (e.g. a bill was voided), so the list can refresh its balances. */
  onChanged: () => void;
}

const TXN_TONE: Record<string, "success" | "warning" | "neutral"> = {
  PURCHASE: "warning",
  PAYMENT: "success",
  ADJUSTMENT: "neutral",
};

export function SupplierDetailModal({ supplier, onClose, onRecordPurchase, onChanged }: SupplierDetailModalProps) {
  const push = useToastStore((s) => s.push);

  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [purchases, setPurchases] = useState<SupplierPurchaseDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detailResult, purchasesResult] = await Promise.all([
        suppliersApi.get(supplier.id),
        supplierPurchasesApi.list(supplier.id),
      ]);
      setDetail(detailResult);
      setPurchases(purchasesResult);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load supplier details.");
    } finally {
      setIsLoading(false);
    }
  }, [supplier.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleVoid(bill: SupplierPurchaseDetail) {
    const parsed = voidSupplierPurchaseSchema.safeParse({ reason: voidReason.trim() });
    if (!parsed.success) {
      setVoidError(parsed.error.issues[0]?.message ?? "A reason is required.");
      return;
    }
    setVoidError(null);

    setIsVoiding(true);
    try {
      await supplierPurchasesApi.void(supplier.id, bill.id, parsed.data);
      push("success", "Bill voided. The stock was removed and the amount owed went back down.");
      setVoidingId(null);
      setVoidReason("");
      await load();
      onChanged();
    } catch (err) {
      // e.g. some of those pieces were already sold: the server message explains.
      setVoidError(err instanceof Error ? err.message : "Could not void this bill.");
    } finally {
      setIsVoiding(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={supplier.name}
      size="lg"
      footer={
        <>
          {supplier.status !== "ACTIVE" && (
            <span className="mr-auto text-xs text-warning">Inactive supplier: activate it to record new bills.</span>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onRecordPurchase} disabled={supplier.status !== "ACTIVE"}>
            Record new bill
          </Button>
        </>
      }
    >
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

          {/* Stock bills */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Stock bills</p>
            {purchases.length === 0 ? (
              <p className="rounded-control border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400">
                No stock bills yet. Use "Record new bill" to enter the maal you received.
              </p>
            ) : (
              <div className="space-y-2">
                {purchases.map((bill) => {
                  const pieces = bill.items.reduce((sum, i) => sum + i.quantity, 0);
                  const isOpen = expandedId === bill.id;
                  const isVoid = bill.status === "VOID";
                  return (
                    <div
                      key={bill.id}
                      className={clsx("rounded-control border border-gray-200", isVoid && "bg-gray-50")}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : bill.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={clsx("text-sm font-medium", isVoid ? "text-gray-400 line-through" : "text-gray-900")}>
                              {bill.billNo ? `Bill ${bill.billNo}` : "Stock purchase"}
                            </span>
                            {isVoid && <Badge tone="danger">Voided</Badge>}
                            <span className="text-xs text-gray-400">{formatDate(bill.purchaseDate)}</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            {pieces} {pieces === 1 ? "piece" : "pieces"} · {bill.items.length}{" "}
                            {bill.items.length === 1 ? "line" : "lines"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={clsx("font-medium", isVoid ? "text-gray-400 line-through" : "text-gray-900")}>
                            {formatCurrency(bill.totalAmount)}
                          </span>
                          <ChevronDown size={16} className={clsx("text-gray-400 transition-transform", isOpen && "rotate-180")} />
                        </div>
                      </button>

                      {isOpen && (
                        <div className="space-y-3 border-t border-gray-100 px-3 py-3">
                          <table className="w-full text-xs">
                            <thead className="text-left uppercase text-gray-400">
                              <tr>
                                <th className="py-1">Item</th>
                                <th className="py-1">Size / Color</th>
                                <th className="py-1 text-right">Pieces</th>
                                <th className="py-1 text-right">Price / piece</th>
                                <th className="py-1 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bill.items.map((item) => (
                                <tr key={item.id} className="border-t border-gray-100">
                                  <td className="py-1.5 text-gray-800">{item.productNameSnapshot}</td>
                                  <td className="py-1.5 text-gray-600">
                                    {item.sizeSnapshot} / {item.colorSnapshot}
                                  </td>
                                  <td className="py-1.5 text-right">{item.quantity}</td>
                                  <td className="py-1.5 text-right">{formatCurrency(item.unitCost)}</td>
                                  <td className="py-1.5 text-right font-medium">{formatCurrency(item.lineTotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {bill.notes && (
                            <p className="whitespace-pre-line text-xs text-gray-500">{bill.notes}</p>
                          )}
                          <p className="text-xs text-gray-400">Entered by {bill.createdBy.fullName}</p>

                          {!isVoid &&
                            (voidingId === bill.id ? (
                              <div className="space-y-2 rounded-control bg-gray-50 p-3">
                                <p className="text-xs text-gray-500">
                                  Voiding removes this stock and takes {formatCurrency(bill.totalAmount)} off what you
                                  owe. It is blocked if some of these pieces were already sold.
                                </p>
                                <textarea
                                  value={voidReason}
                                  onChange={(e) => setVoidReason(e.target.value)}
                                  rows={2}
                                  placeholder="Reason, e.g. Entered with the wrong prices"
                                  disabled={isVoiding}
                                  className="w-full rounded-control border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                                {voidError && <p className="text-xs text-danger">{voidError}</p>}
                                <div className="flex gap-2">
                                  <Button variant="danger" size="sm" isLoading={isVoiding} onClick={() => handleVoid(bill)}>
                                    Void bill
                                  </Button>
                                  <Button variant="secondary" size="sm" disabled={isVoiding} onClick={() => setVoidingId(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                  setVoidingId(bill.id);
                                  setVoidReason("");
                                  setVoidError(null);
                                }}
                              >
                                <Ban size={14} />
                                Void this bill
                              </Button>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ledger */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Account history</p>
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
                        {txn.type === "PAYMENT"
                          ? `${txn.paymentMethod.replace("_", " ")}${txn.referenceNo ? ` · ${txn.referenceNo}` : ""} · `
                          : ""}
                        by {txn.createdBy.fullName}
                      </p>
                    </div>
                    <span className={`font-medium ${txn.amount < 0 ? "text-success" : "text-gray-900"}`}>
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
  const toneClass = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-gray-900";
  return (
    <div className="rounded-control border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{formatCurrency(value)}</p>
    </div>
  );
}