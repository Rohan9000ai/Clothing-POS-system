import { useState, type FormEvent } from "react";
import { Button, Modal } from "@muzammil-pos/ui";
import { voidSaleSchema } from "@muzammil-pos/validation";
import { salesApi, type SaleDetail } from "../../services/sales";
import { zodFieldErrors } from "../../utils/formErrors";

interface VoidSaleModalProps {
  sale: SaleDetail;
  onClose: () => void;
  onVoided: (sale: SaleDetail) => void;
}

export function VoidSaleModal({ sale, onClose, onVoided }: VoidSaleModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = voidSaleSchema.safeParse({ reason: reason.trim() });
    if (!parsed.success) {
      setError(Object.values(zodFieldErrors(parsed.error))[0] ?? "A reason is required.");
      return;
    }
    setError(null);

    setIsSubmitting(true);
    try {
      const voided = await salesApi.void(sale.id, parsed.data);
      onVoided(voided);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not void this sale.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => !isSubmitting && onClose()}
      title={`Void sale ${sale.billNo}?`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="void-sale-form" variant="danger" isLoading={isSubmitting}>
            Void sale
          </Button>
        </>
      }
    >
      <form id="void-sale-form" onSubmit={handleSubmit} className="space-y-3" noValidate>
        <p className="text-sm text-gray-600">
          This restores stock for every item on this sale and marks it as void. This cannot be undone.
        </p>
        <div>
          <label className="text-xs font-medium text-gray-700">Reason for voiding</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Customer returned the items"
            disabled={isSubmitting}
            className="mt-1.5 w-full rounded-control border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>
        {formError && (
          <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{formError}</div>
        )}
      </form>
    </Modal>
  );
}