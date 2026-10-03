import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge, Button, Modal, Select, toneForStatus } from "@muzammil-pos/ui";
import { formatCurrency, fromPaisa, toPaisa } from "@muzammil-pos/utils";
import { salePaymentSchema, type SalePaymentInput } from "@muzammil-pos/validation";
import type { SalePaymentMethod, PaymentStatus } from "@muzammil-pos/types";
import { useCartStore } from "../../../store/cartStore";
import { useToastStore } from "../../../store/toastStore";
import { salesApi } from "../../../services/sales";
import { HttpError } from "../../../services/http";
import { zodFieldErrors } from "../../../utils/formErrors";
import { useNavigate } from "react-router-dom";

const METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
];

function referenceLabel(method: SalePaymentMethod): string {
  switch (method) {
    case "BANK_TRANSFER":
      return "Bank name & account number";
    case "EASYPAISA":
    case "JAZZCASH":
      return "Mobile number / transaction ID";
    default:
      return "";
  }
}

function derivePaymentStatus(paidTotal: number, netTotal: number): PaymentStatus {
  if (paidTotal <= 0) return "UNPAID";
  if (paidTotal >= netTotal) return "PAID";
  return "PARTIAL";
}

interface PaymentModalProps {
  onClose: () => void;
}

export function PaymentModal({ onClose }: PaymentModalProps) {
  const { items, salesmanId, clearCart } = useCartStore();
  const push = useToastStore((s) => s.push);

  const subTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discountTotal = items.reduce((sum, i) => sum + i.lineDiscount, 0);
  const netTotal = subTotal - discountTotal;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const [payments, setPayments] = useState<SalePaymentInput[]>([]);
  const paidTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(netTotal - paidTotal, 0);
  const previewStatus = derivePaymentStatus(paidTotal, netTotal);

  const [method, setMethod] = useState<SalePaymentMethod>("CASH");
  const [amountInput, setAmountInput] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function handleAddPayment() {
    setPaymentError(null);

    const rupees = Number(amountInput);
    const raw = {
      method,
      amount: Number.isNaN(rupees) ? NaN : toPaisa(rupees),
      referenceNo: referenceNo.trim() || undefined,
    };

    const parsed = salePaymentSchema.safeParse(raw);
    if (!parsed.success) {
      setPaymentError(Object.values(zodFieldErrors(parsed.error))[0] ?? "Invalid payment details.");
      return;
    }
    if (parsed.data.amount <= 0) {
      setPaymentError("Amount must be greater than 0.");
      return;
    }
    if (parsed.data.amount > remaining) {
      setPaymentError(`Amount cannot exceed the remaining balance of ${formatCurrency(remaining)}.`);
      return;
    }

    setPayments((prev) => [...prev, parsed.data]);
    setAmountInput("");
    setReferenceNo("");
  }

  function handleRemovePayment(index: number) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFillRemaining() {
    setAmountInput(remaining > 0 ? String(fromPaisa(remaining)) : "");
  }

  const navigate = useNavigate();
  async function handleSave() {
    if (items.length === 0) return;
    setSaveError(null);
    setIsSaving(true);

    try {
      const sale = await salesApi.create({
        salesmanId: salesmanId ?? undefined,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          lineDiscount: i.lineDiscount,
        })),
        discountTotal: 0,
        payments,
      });

      push("success", `Sale ${sale.billNo} saved successfully.`);
      clearCart();
      navigate(`/invoice/${sale.id}`);
    } catch (err) {
      if (err instanceof HttpError && err.code === "INSUFFICIENT_STOCK") {
        setSaveError(`${err.message} Please adjust the quantity in the cart and try again.`);
      } else if (err instanceof HttpError && err.code === "PAYMENT_EXCEEDS_NET_TOTAL") {
        setSaveError("Total payment cannot exceed the net total. Please adjust the payment amount.");
      } else {
        setSaveError(err instanceof Error ? err.message : "Could not save the sale. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => !isSaving && onClose()}
      title="Payment"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isSaving}>
            Save sale
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Totals summary */}
        <div className="space-y-1.5 rounded-control border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Items</span>
            <span>{itemCount}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>{formatCurrency(subTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Discount</span>
            <span>−{formatCurrency(discountTotal)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1.5 font-semibold text-gray-900">
            <span>Net total</span>
            <span>{formatCurrency(netTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Paid</span>
            <span>{formatCurrency(paidTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Remaining</span>
            <span className={remaining > 0 ? "font-medium text-warning" : "font-medium text-success"}>
              {formatCurrency(remaining)}
            </span>
          </div>
          <div className="flex justify-end pt-1">
            <Badge tone={toneForStatus(previewStatus)}>
              Will be saved as {previewStatus === "PAID" ? "Paid" : previewStatus === "PARTIAL" ? "Partial" : "Unpaid"}
            </Badge>
          </div>
        </div>

        {/* Payment entry */}
        {remaining > 0 && (
          <div className="rounded-control border border-gray-200 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Add payment</p>
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Method"
                value={method}
                onChange={(e) => setMethod(e.target.value as SalePaymentMethod)}
                options={METHOD_OPTIONS}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">Amount (Rs.)</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full rounded-control border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={handleFillRemaining}>
                    Full
                  </Button>
                </div>
              </div>
            </div>

            {method !== "CASH" && (
              <div className="mt-2">
                <label className="text-xs font-medium text-gray-700">{referenceLabel(method)}</label>
                <input
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder={referenceLabel(method)}
                  className="mt-1.5 w-full rounded-control border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              {paymentError && <p className="text-xs text-danger">{paymentError}</p>}
              <Button size="sm" className="ml-auto" onClick={handleAddPayment}>
                Add payment
              </Button>
            </div>
          </div>
        )}

        {/* Added payments list */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Payments added</p>
            {payments.map((p, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-control border border-gray-200 px-3 py-2 text-sm"
              >
                <div>
                  <Badge tone="neutral">{p.method.replace("_", " ")}</Badge>
                  {p.referenceNo && <span className="ml-2 text-xs text-gray-400">{p.referenceNo}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{formatCurrency(p.amount)}</span>
                  <button
                    onClick={() => handleRemovePayment(index)}
                    className="rounded-control p-1 text-gray-300 hover:bg-danger-light hover:text-danger"
                    title="Remove payment"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {saveError && (
          <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{saveError}</div>
        )}
      </div>
    </Modal>
  );
}