import { useState, type FormEvent } from "react";
import { Button, Input, Modal } from "@muzammil-pos/ui";
import type { Supplier } from "@muzammil-pos/types";
import { createSupplierSchema, updateSupplierSchema } from "@muzammil-pos/validation";
import { toPaisa, fromPaisa } from "@muzammil-pos/utils";
import { suppliersApi } from "../../services/suppliers";
import { getFieldErrors, zodFieldErrors } from "../../utils/formErrors";

interface SupplierFormModalProps {
  /** Pass a supplier to edit; omit to create a new one. */
  supplier?: Supplier;
  onClose: () => void;
  onSaved: (supplier: Supplier, mode: "create" | "edit") => void;
}

export function SupplierFormModal({ supplier, onClose, onSaved }: SupplierFormModalProps) {
  const isEdit = !!supplier;

  const [name, setName] = useState(supplier?.name ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [openingBalance, setOpeningBalance] = useState(
    supplier ? String(fromPaisa(supplier.openingBalance)) : "0"
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (isEdit) {
      const parsed = updateSupplierSchema.safeParse({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      if (!parsed.success) {
        setErrors(zodFieldErrors(parsed.error));
        return;
      }
      setErrors({});
      setIsSubmitting(true);
      try {
        const saved = await suppliersApi.update(supplier.id, parsed.data);
        onSaved(saved, "edit");
      } catch (err) {
        const fieldErrors = getFieldErrors(err);
        if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
        else setFormError(err instanceof Error ? err.message : "Could not save supplier.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const rupees = openingBalance === "" ? 0 : Number(openingBalance);
    const parsed = createSupplierSchema.safeParse({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      openingBalance: Number.isNaN(rupees) ? NaN : toPaisa(rupees),
    });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      const saved = await suppliersApi.create(parsed.data);
      onSaved(saved, "create");
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else setFormError(err instanceof Error ? err.message : "Could not save supplier.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => !isSubmitting && onClose()}
      title={isEdit ? "Edit supplier" : "Add supplier"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="supplier-form" isLoading={isSubmitting}>
            {isEdit ? "Save changes" : "Add supplier"}
          </Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Supplier business name"
          placeholder="e.g. Paramount Apparels Ltd"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={isSubmitting}
          autoFocus
        />
        <Input
          label="Contact phone number"
          placeholder="e.g. 0300-1234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          disabled={isSubmitting}
        />
        <Input
          label="Physical address"
          placeholder="e.g. 102 Sector-C, Industrial Zone"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          error={errors.address}
          disabled={isSubmitting}
        />
        {!isEdit && (
          <Input
            label="Opening balance (Rs.)"
            type="number"
            min="0"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            error={errors.openingBalance}
            hint="What the shop already owed this supplier before using this system."
            disabled={isSubmitting}
          />
        )}

        {formError && (
          <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{formError}</div>
        )}
      </form>
    </Modal>
  );
}