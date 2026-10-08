import { useState, type FormEvent } from "react";
import { Button, Input, Modal, Select } from "@muzammil-pos/ui";
import type { ExpenseType, PayoutMethod } from "@muzammil-pos/types";
import { createExpenseSchema, updateExpenseSchema } from "@muzammil-pos/validation";
import { fromPaisa, toPaisa } from "@muzammil-pos/utils";
import { expensesApi, type ExpenseDetail } from "../../services/expenses";
import type { SupplierWithBalance } from "../../services/suppliers";
import type { SalesmanWithStats } from "../../services/salesmenAdmin";
import { getFieldErrors, zodFieldErrors } from "../../utils/formErrors";
import { EXPENSE_TYPE_OPTIONS, PAYMENT_METHOD_OPTIONS } from "./expenseMeta";
import { toLocalYmd } from "./expenseRange";

interface ExpenseFormModalProps {
  /** Pass an expense to edit; omit to create a new one. */
  expense?: ExpenseDetail;
  suppliers: SupplierWithBalance[];
  salesmen: SalesmanWithStats[];
  onClose: () => void;
  onSaved: (expense: ExpenseDetail, mode: "create" | "edit") => void;
}

export function ExpenseFormModal({ expense, suppliers, salesmen, onClose, onSaved }: ExpenseFormModalProps) {
  const isEdit = !!expense;

  const [expenseDate, setExpenseDate] = useState(
    expense ? expense.expenseDate.slice(0, 10) : toLocalYmd(new Date())
  );
  const [type, setType] = useState<ExpenseType>(expense?.type ?? "ELECTRICITY");
  const [title, setTitle] = useState(expense?.title ?? "");
  const [amount, setAmount] = useState(expense ? String(fromPaisa(expense.amount)) : "");
  const [paymentMethod, setPaymentMethod] = useState<PayoutMethod>(expense?.paymentMethod ?? "CASH");
  const [referenceNo, setReferenceNo] = useState(expense?.referenceNo ?? "");
  const [supplierId, setSupplierId] = useState(expense?.supplierId ?? "");
  const [salesmanId, setSalesmanId] = useState(expense?.salesmanId ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showSupplier = type === "SUPPLIER_PAYMENT";
  const showSalesman = type === "SALARIES" || type === "PAYOUTS";
  /** True when this expense already has a matching payment on a supplier's account. */
  const hasLinkedPayment = !!expense?.supplierTransactionId;

  const supplierOptions = suppliers
    .filter((s) => s.status === "ACTIVE" || s.id === expense?.supplierId)
    .map((s) => ({ value: s.id, label: s.status === "ACTIVE" ? s.name : `${s.name} (inactive)` }));

  const salesmanOptions = [
    { value: "", label: "No salesman linked" },
    ...salesmen
      .filter((s) => s.status === "ACTIVE" || s.id === expense?.salesmanId)
      .map((s) => ({ value: s.id, label: s.status === "ACTIVE" ? s.name : `${s.name} (inactive)` })),
  ];

  async function submit(action: () => Promise<ExpenseDetail>, mode: "create" | "edit") {
    setIsSubmitting(true);
    try {
      const saved = await action();
      onSaved(saved, mode);
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        setFormError(err instanceof Error ? err.message : "Could not save the expense.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const titleTrimmed = title.trim();
    const referenceTrimmed = referenceNo.trim();
    const notesTrimmed = notes.trim();
    const rupees = amount === "" ? NaN : Number(amount);
    const amountPaisa = Number.isNaN(rupees) ? NaN : toPaisa(rupees);

    // Links only apply to the types that show them.
    const nextSupplierId = showSupplier ? supplierId : "";
    const nextSalesmanId = showSalesman ? salesmanId : "";

    // "Other" must have a title, and a supplier payment must name its supplier.
    // Checked here too because the update schema treats missing fields as "unchanged".
    const manualErrors: Record<string, string> = {};
    if (type === "OTHER" && !titleTrimmed) {
      manualErrors.title = "Title is required when expense type is Other.";
    }
    if (showSupplier && !nextSupplierId) {
      manualErrors.supplierId = "Select the supplier this payment was made to.";
    }

    if (isEdit && expense) {
      const parsed = updateExpenseSchema.safeParse({
        expenseDate,
        title: titleTrimmed || undefined,
        type,
        amount: amountPaisa,
        paymentMethod,
        // An empty string clears a previously saved reference.
        referenceNo: paymentMethod === "ONLINE_TRANSFER" ? referenceTrimmed : "",
        // Only send a link when it actually changed. The server rejects newly chosen
        // links to inactive records, which would otherwise block editing unrelated fields.
        supplierId: nextSupplierId !== (expense.supplierId ?? "") ? nextSupplierId || null : undefined,
        salesmanId: nextSalesmanId !== (expense.salesmanId ?? "") ? nextSalesmanId || null : undefined,
        notes: notesTrimmed,
      });

      if (!parsed.success || Object.keys(manualErrors).length > 0) {
        setErrors({ ...(parsed.success ? {} : zodFieldErrors(parsed.error)), ...manualErrors });
        return;
      }
      setErrors({});
      await submit(() => expensesApi.update(expense.id, parsed.data), "edit");
      return;
    }

    const parsed = createExpenseSchema.safeParse({
      expenseDate,
      title: titleTrimmed || undefined,
      type,
      amount: amountPaisa,
      paymentMethod,
      referenceNo: paymentMethod === "ONLINE_TRANSFER" && referenceTrimmed ? referenceTrimmed : undefined,
      supplierId: nextSupplierId || undefined,
      salesmanId: nextSalesmanId || undefined,
      notes: notesTrimmed || undefined,
    });

    if (!parsed.success || Object.keys(manualErrors).length > 0) {
      setErrors({ ...(parsed.success ? {} : zodFieldErrors(parsed.error)), ...manualErrors });
      return;
    }
    setErrors({});
    await submit(() => expensesApi.create(parsed.data), "create");
  }

  return (
    <Modal
      isOpen
      onClose={() => !isSubmitting && onClose()}
      title={isEdit ? "Edit expense" : "Add expense"}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" isLoading={isSubmitting}>
            {isEdit ? "Save changes" : "Add expense"}
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            error={errors.expenseDate}
            disabled={isSubmitting}
          />
          <Input
            label="Amount (Rs.)"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amount}
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as ExpenseType)}
          options={EXPENSE_TYPE_OPTIONS}
          error={errors.type}
          disabled={isSubmitting}
        />

        {hasLinkedPayment && !showSupplier && (
          <div className="rounded-control bg-warning-light px-3 py-2 text-xs text-warning">
            This expense currently has a matching payment on a supplier's account. Saving with a different
            type removes that payment, so what you owe the supplier goes back up.
          </div>
        )}

        {showSupplier && (
          <div>
            <Select
              label="Supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              options={supplierOptions}
              placeholder="Select the supplier you paid"
              error={errors.supplierId}
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-400">
              {hasLinkedPayment
                ? "Changes here also update the matching payment on the supplier's account."
                : "This also records a payment on the supplier's account, so what you owe them goes down."}
            </p>
          </div>
        )}

        {showSalesman && (
          <Select
            label="Salesman (optional)"
            value={salesmanId}
            onChange={(e) => setSalesmanId(e.target.value)}
            options={salesmanOptions}
            error={errors.salesmanId}
            disabled={isSubmitting}
          />
        )}

        <Input
          label={type === "OTHER" ? "Title (required for Other)" : "Title (optional)"}
          placeholder={type === "OTHER" ? "e.g. Courier packaging" : "Leave blank to use the default title"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PayoutMethod)}
            options={PAYMENT_METHOD_OPTIONS}
            error={errors.paymentMethod}
            disabled={isSubmitting}
          />
          {paymentMethod === "ONLINE_TRANSFER" ? (
            <Input
              label="Reference no. (optional)"
              placeholder="Transaction ID / invoice"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              error={errors.referenceNo}
              disabled={isSubmitting}
            />
          ) : (
            <div />
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Main outlet utility, September"
            disabled={isSubmitting}
            className="mt-1.5 w-full rounded-control border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {formError && (
          <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{formError}</div>
        )}
      </form>
    </Modal>
  );
}