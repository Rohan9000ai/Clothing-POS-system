import { useState, type FormEvent } from "react";
import { Button, Input, Modal, Select } from "@muzammil-pos/ui";
import type { User, UserRole } from "@muzammil-pos/types";
import { createUserSchema, updateUserSchema } from "@muzammil-pos/validation";
import { usersApi } from "../../services/users";
import { getFieldErrors, zodFieldErrors } from "../../utils/formErrors";

const ROLE_OPTIONS = [
  { value: "CASHIER", label: "Cashier" },
  { value: "ADMIN", label: "Admin" },
];

interface UserFormModalProps {
  /** Pass a user to edit; omit to create a new one. */
  user?: User;
  onClose: () => void;
  onSaved: (user: User, mode: "create" | "edit") => void;
}

export function UserFormModal({ user, onClose, onSaved }: UserFormModalProps) {
  const isEdit = !!user;

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(user?.role ?? "CASHIER");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    // 1. Client-side validation using the same Zod schemas the server uses.
    const parsed = isEdit
      ? updateUserSchema.safeParse({ fullName: fullName.trim(), role })
      : createUserSchema.safeParse({
          fullName: fullName.trim(),
          username: username.trim(),
          password,
          role,
        });

    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});

    // 2. Submit. Server-side rules (duplicate username, last admin, etc.)
    //    come back as errors and are shown under the field or as a banner.
    setIsSubmitting(true);
    try {
      if (isEdit && user) {
        const saved = await usersApi.update(user.id, {
          fullName: fullName.trim(),
          role,
        });
        onSaved(saved, "edit");
      } else {
        const saved = await usersApi.create({
          fullName: fullName.trim(),
          username: username.trim(),
          password,
          role,
        });
        onSaved(saved, "create");
      }
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
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
      title={isEdit ? "Edit user" : "Add user"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" isLoading={isSubmitting}>
            {isEdit ? "Save changes" : "Add user"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          disabled={isSubmitting}
          autoFocus
        />

        <Input
          label="Username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          hint={isEdit ? "Username cannot be changed." : "Letters, numbers, dots, dashes and underscores."}
          disabled={isSubmitting || isEdit}
          autoComplete="off"
        />

        {!isEdit && (
          <Input
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint="At least 6 characters, with a letter and a number."
            disabled={isSubmitting}
            autoComplete="new-password"
          />
        )}

        <Select
          label="Role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          options={ROLE_OPTIONS}
          error={errors.role}
          disabled={isSubmitting}
        />

        {formError && (
          <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{formError}</div>
        )}
      </form>
    </Modal>
  );
}