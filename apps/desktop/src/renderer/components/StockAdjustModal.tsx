import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Button, Modal } from "@muzammil-pos/ui";

type Mode = "REMOVE" | "ADD";

const REASONS: Record<Mode, string[]> = {
  REMOVE: ["Damaged", "Lost or stolen", "Wrong count (correction)", "Other"],
  ADD: ["Customer return", "Wrong count (correction)", "Other"],
};

interface StockAdjustModalProps {
  label: string;
  currentQuantity: number;
  onClose: () => void;
  onSubmit: (quantityChange: number, reason: string) => Promise<void>;
}

const field =
  "w-full rounded-control border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

export function StockAdjustModal({ label, currentQuantity, onClose, onSubmit }: StockAdjustModalProps) {
  const [mode, setMode] = useState<Mode>("REMOVE");
  const [reasonChoice, setReasonChoice] = useState("Damaged");
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function pickMode(next: Mode) {
    setMode(next);
    setReasonChoice(REASONS[next][0] ?? "Other");
    setError(null);
  }

  const qty = Number(quantity);
  const validQty = quantity !== "" && Number.isInteger(qty) && qty >= 1;
  const after = currentQuantity + (validQty ? (mode === "REMOVE" ? -qty : qty) : 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validQty) {
      setError("Enter a whole number of pieces, 1 or more.");
      return;
    }
    if (mode === "REMOVE" && qty > currentQuantity) {
      setError(`Only ${currentQuantity} in stock, so you can't remove ${qty}.`);
      return;
    }
    if (reasonChoice === "Other" && note.trim().length < 3) {
      setError('Please write a short note for "Other".');
      return;
    }

    const reason = note.trim() ? `${reasonChoice} — ${note.trim()}` : reasonChoice;
    setError(null);
    setIsSaving(true);
    try {
      await onSubmit(mode === "REMOVE" ? -qty : qty, reason);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the stock.");
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => !isSaving && onClose()}
      title="Adjust stock"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="stock-adjust-form"
            variant={mode === "REMOVE" ? "danger" : "primary"}
            isLoading={isSaving}
          >
            {mode === "REMOVE" ? "Remove stock" : "Add stock"}
          </Button>
        </>
      }
    >
      <form id="stock-adjust-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">In stock now: {currentQuantity}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["REMOVE", "Remove (damaged / lost)"],
              ["ADD", "Add (customer return)"],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              onClick={() => pickMode(value)}
              aria-pressed={mode === value}
              className={clsx(
                "rounded-control border px-2 py-2 text-xs font-medium transition-colors",
                mode === value
                  ? value === "REMOVE"
                    ? "border-danger bg-danger-light text-danger"
                    : "border-brand bg-brand-light text-brand"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              )}
            >
              {text}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700">Number of pieces</label>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setError(null);
            }}
            disabled={isSaving}
            className={clsx(field, "mt-1.5")}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700">Reason</label>
          <select
            value={reasonChoice}
            onChange={(e) => {
              setReasonChoice(e.target.value);
              setError(null);
            }}
            disabled={isSaving}
            className={clsx(field, "mt-1.5")}
          >
            {REASONS[mode].map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700">
            Note {reasonChoice === "Other" ? "(required)" : "(optional)"}
          </label>
          <input
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError(null);
            }}
            placeholder="e.g. torn at the seam"
            disabled={isSaving}
            className={clsx(field, "mt-1.5")}
          />
        </div>

        <p className="rounded-control bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Stock will change from <span className="font-semibold">{currentQuantity}</span> to{" "}
          <span className="font-semibold">{after}</span>.
        </p>

        {error && <p className="text-xs text-danger">{error}</p>}
      </form>
    </Modal>
  );
}