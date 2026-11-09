import { useState, type FormEvent } from "react";
import { Button, Input, Modal } from "@muzammil-pos/ui";
import { useT } from "../i18n/store";

interface ConfirmDeleteModalProps {
  itemName: string;
  note?: string;
  onClose: () => void;
  onDelete: (password: string) => Promise<void>;
}

export function ConfirmDeleteModal({ itemName, note, onClose, onDelete }: ConfirmDeleteModalProps) {
  const t = useT();
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) {
      setError(t("Enter your password."));
      return;
    }
    setError(null);
    setIsDeleting(true);
    try {
      await onDelete(password);
      onClose();
    } catch (err) {
      setPassword("");
      setError(err instanceof Error ? t(err.message) : t("Could not delete. Please try again."));
      setIsDeleting(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => !isDeleting && onClose()}
      title={step === 1 ? t("Delete") : t("Admin password")}
      size="sm"
      footer={
        step === 1 ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button variant="danger" onClick={() => setStep(2)}>
              {t("Confirm")}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
              {t("Cancel")}
            </Button>
            <Button type="submit" form="confirm-delete-form" variant="danger" isLoading={isDeleting}>
              {t("Delete")}
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-700">{t("Do you want to delete {name}?", { name: itemName })}</p>
          {note && <p className="text-xs text-gray-500">{note}</p>}
          <p className="text-xs text-gray-400">{t("This cannot be undone.")}</p>
        </div>
      ) : (
        <form id="confirm-delete-form" onSubmit={handleSubmit} className="space-y-3" noValidate>
          <p className="text-sm text-gray-700">
            {t("Enter your admin password to delete {name}.", { name: itemName })}
          </p>
          <Input
            label={t("Admin password")}
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            error={error ?? undefined}
            disabled={isDeleting}
          />
        </form>
      )}
    </Modal>
  );
}