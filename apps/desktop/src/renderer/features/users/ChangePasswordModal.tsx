import { useState, type FormEvent } from "react";
import { Button, Input, Modal } from "@muzammil-pos/ui";
import type { User } from "@muzammil-pos/types";
import { changePasswordSchema } from "@muzammil-pos/validation";
import { usersApi } from "../../services/users";
import { getFieldErrors, zodFieldErrors } from "../../utils/formErrors";

interface ChangePasswordModalProps {
  user: User;
  onClose: () => void;
  onChanged: (user: User) => void;
}

export function ChangePasswordModal({ user, onClose, onChanged }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = changePasswordSchema.safeParse({ newPassword });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match." });
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      await usersApi.changePassword(user.id, { newPassword });
      onChanged(user);
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        // Server reports it as "newPassword"; show under the first password field.
        setErrors(fieldErrors);
      } else {
        setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => !isSubmitting && onClose()}
      title={`Change password — ${user.fullName}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="password-form" isLoading={isSubmitting}>
            Update password
          </Button>
        </>
      }
    >
      <form id="password-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="New password"
          name="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={errors.newPassword}
          hint="At least 6 characters, with a letter and a number."
          disabled={isSubmitting}
          autoComplete="new-password"
          autoFocus
        />
        <Input
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          disabled={isSubmitting}
          autoComplete="new-password"
        />

        {formError && (
          <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{formError}</div>
        )}
      </form>
    </Modal>
  );
}