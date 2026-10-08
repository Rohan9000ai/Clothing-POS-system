import { useState, type FormEvent } from "react";
import { Button, Modal } from "@muzammil-pos/ui";
import { formatCurrency } from "@muzammil-pos/utils";
import { voidExpenseSchema } from "@muzammil-pos/validation";
import { expensesApi, type ExpenseDetail } from "../../services/expenses";
import { zodFieldErrors } from "../../utils/formErrors";
import { formatExpenseDate } from "./expenseRange";

interface DeleteExpenseModalProps {
  expense: ExpenseDetail;
  onClose: () => void;
  onDeleted: (expense: ExpenseDetail) => void;
}

export function DeleteExpenseModal({ expense, onClose, onDeleted }: DeleteExpenseModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = voidExpenseSchema.safeParse({ reason: reason.trim() });
    if (!parsed.success) {
      setError(Object.values(zodFieldErrors(parsed.error))[0] ?? "A reason is required.");
      return;
    }
    setError(null);

    setIsSubmitting(true);
    try {
      const voided = await expensesApi.void(expense.id, parsed.data);
      onDeleted(voided);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not delete this expense.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => !isSubmitting && onClose()}
      title="Delete expense?"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="delete-expense-form" variant="danger" isLoading={isSubmitting}>
            Delete expense
          </Button>
        </>
      }
    >
      <form id="delete-expense-form" onSubmit={handleSubmit} className="space-y-3" noValidate>
        <p className="text-sm text-gray-600">
          Delete <span className="font-semibold">{expense.title}</span> ({formatCurrency(expense.amount)}) dated{" "}
          {formatExpenseDate(expense.expenseDate)}?
        </p>
        <p className="text-xs text-gray-400">
          It will be removed from totals and reports. A record is kept for the audit trail and cannot be
          restored from the app.
        </p>
        {expense.supplierTransactionId && (
          <div className="rounded-control bg-warning-light px-3 py-2 text-xs text-warning">
            This also removes the matching payment from {expense.supplier?.name ?? "the supplier"}'s account,
            so what you owe them goes back up by {formatCurrency(expense.amount)}.
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-gray-700">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Entered twice by mistake"
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