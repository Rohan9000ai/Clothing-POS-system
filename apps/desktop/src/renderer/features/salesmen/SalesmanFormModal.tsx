import { useEffect, useState, type FormEvent } from "react";
import { Button, Input, Modal, Select } from "@muzammil-pos/ui";
import type { User } from "@muzammil-pos/types";
import { createSalesmanSchema, updateSalesmanSchema } from "@muzammil-pos/validation";
import { toPaisa, fromPaisa } from "@muzammil-pos/utils";
import { salesmenAdminApi, listLinkableCashierUsers, type SalesmanWithStats } from "../../services/salesmenAdmin";
import { getFieldErrors, zodFieldErrors } from "../../utils/formErrors";

interface SalesmanFormModalProps {
  /** Pass a salesman to edit; omit to create a new one. */
  salesman?: SalesmanWithStats;
  allSalesmen: SalesmanWithStats[];
  onClose: () => void;
  onSaved: (salesman: SalesmanWithStats, mode: "create" | "edit") => void;
}

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

export function SalesmanFormModal({ salesman, allSalesmen, onClose, onSaved }: SalesmanFormModalProps) {
  const isEdit = !!salesman;

  const [name, setName] = useState(salesman?.name ?? "");
  const [phone, setPhone] = useState(salesman?.phone ?? "");
  const [cnic, setCnic] = useState(salesman?.cnic ?? "");
  const [joinDate, setJoinDate] = useState(
    salesman ? toDateInputValue(salesman.joinDate) : toDateInputValue(new Date().toISOString())
  );
  const [salary, setSalary] = useState(salesman ? String(fromPaisa(salesman.salary)) : "");
  const [userId, setUserId] = useState<string>(salesman?.userId ?? "");

  const [linkableUsers, setLinkableUsers] = useState<User[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    listLinkableCashierUsers(allSalesmen).then(setLinkableUsers).catch(() => {
      // Non-fatal: the link dropdown just stays empty if this fails.
    });
  }, [allSalesmen]);

  const userOptions = [
    { value: "", label: "No linked login account" },
    ...linkableUsers.map((u) => ({ value: u.id, label: `${u.fullName} (${u.username})` })),
    // If editing and this salesman already has a link, make sure that option is present
    // even though listLinkableCashierUsers excludes already-linked users.
    ...(isEdit && salesman?.user ? [{ value: salesman.user.id, label: `${salesman.user.fullName} (${salesman.user.username})` }] : []),
  ].filter((opt, index, arr) => arr.findIndex((o) => o.value === opt.value) === index);

    async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const rawSalary = salary === "" ? NaN : Number(salary);
    const rawUserId = userId || undefined;

    setErrors({});
    setIsSubmitting(true);

    try {
      if (isEdit) {
        const parsed = updateSalesmanSchema.safeParse({
          name: name.trim(),
          phone: phone.trim(),
          cnic: cnic.trim(),
          joinDate,
          salary: Number.isNaN(rawSalary) ? undefined : toPaisa(rawSalary),
          userId: rawUserId,
        });
        if (!parsed.success) {
          setErrors(zodFieldErrors(parsed.error));
          setIsSubmitting(false);
          return;
        }
        const saved = await salesmenAdminApi.update(salesman.id, { ...parsed.data, userId: userId || null });
        onSaved(saved, "edit");
      } else {
        const parsed = createSalesmanSchema.safeParse({
          name: name.trim(),
          phone: phone.trim(),
          cnic: cnic.trim(),
          joinDate,
          salary: Number.isNaN(rawSalary) ? NaN : toPaisa(rawSalary),
          userId: rawUserId,
        });
        if (!parsed.success) {
          setErrors(zodFieldErrors(parsed.error));
          setIsSubmitting(false);
          return;
        }
        const saved = await salesmenAdminApi.create(parsed.data);
        onSaved(saved, "create");
      }
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        setFormError(err instanceof Error ? err.message : "Could not save salesman.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => !isSubmitting && onClose()}
      title={isEdit ? "Edit salesman" : "Onboard salesperson"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="salesman-form" isLoading={isSubmitting}>
            {isEdit ? "Save changes" : "Register agent"}
          </Button>
        </>
      }
    >
      <form id="salesman-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          placeholder="e.g. Muhammad Harris"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={isSubmitting}
          autoFocus
        />
        <Input
          label="Phone number"
          placeholder="e.g. 0300-1234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          disabled={isSubmitting}
        />
        <Input
          label="National CNIC / ID"
          placeholder="e.g. 35201-1234567-9"
          value={cnic}
          onChange={(e) => setCnic(e.target.value)}
          error={errors.cnic}
          disabled={isSubmitting}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Base monthly salary (Rs.)"
            type="number"
            min="0"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            error={errors.salary}
            disabled={isSubmitting}
          />
          <Input
            label="Onboarding date"
            type="date"
            value={joinDate}
            onChange={(e) => setJoinDate(e.target.value)}
            error={errors.joinDate}
            disabled={isSubmitting}
          />
        </div>
                <div>
          <Select
            label="Linked login account"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            options={userOptions}
            error={errors.userId}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-400">
            Optional — lets this salesman also log in as a cashier.
          </p>
        </div>

        {formError && (
          <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{formError}</div>
        )}
      </form>
    </Modal>
  );
}