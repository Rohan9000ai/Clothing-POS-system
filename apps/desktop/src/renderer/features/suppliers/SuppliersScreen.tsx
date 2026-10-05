import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge, Button, Card, Modal, Table, ToggleSwitch, toneForStatus, type TableColumn } from "@muzammil-pos/ui";
import type { Supplier } from "@muzammil-pos/types";
import { formatCurrency } from "@muzammil-pos/utils";
import { suppliersApi, type SupplierWithBalance } from "../../services/suppliers";
import { useToastStore } from "../../store/toastStore";
import { SupplierFormModal } from "./SupplierFormModal";
import { SupplierDetailModal } from "./SupplierDetailModal";

export function SuppliersScreen() {
  const push = useToastStore((s) => s.push);

  const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [formModal, setFormModal] = useState<{ supplier?: Supplier } | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setSuppliers(await suppliersApi.list());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load suppliers.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.phone.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  function replaceSupplier(updated: Supplier) {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
    );
  }

  function handleSaved(saved: Supplier, mode: "create" | "edit") {
    if (mode === "create") {
      push("success", `Supplier "${saved.name}" was added.`);
      void loadSuppliers();
    } else {
      replaceSupplier(saved);
      push("success", `Supplier "${saved.name}" was updated.`);
    }
    setFormModal(null);
  }

  async function handleToggleStatus(supplier: Supplier) {
    const next = supplier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyId(supplier.id);
    try {
      const updated = await suppliersApi.setStatus(supplier.id, next);
      replaceSupplier(updated);
      push("success", `"${supplier.name}" is now ${next === "ACTIVE" ? "active" : "inactive"}.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not change status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await suppliersApi.remove(deleteTarget.id);
      setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      push("success", `Supplier "${deleteTarget.name}" was deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      // e.g. supplier has transaction history — server message explains.
      push("error", err instanceof Error ? err.message : "Could not delete supplier.");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: TableColumn<SupplierWithBalance>[] = [
    {
      header: "Supplier / Contact",
      render: (s) => (
        <div>
          <p className="font-medium text-gray-900">{s.name}</p>
          <p className="text-xs text-gray-400">{s.phone}</p>
        </div>
      ),
    },
    { header: "Address", render: (s) => <span className="text-xs text-gray-500">{s.address}</span> },
    {
      header: "Opening Bal",
      className: "text-right",
      render: (s) => <span className="text-gray-600">{formatCurrency(s.balance.openingBalance)}</span>,
    },
    {
      header: "Total Bal",
      className: "text-right",
      render: (s) => <span className="font-medium text-gray-900">{formatCurrency(s.balance.totalBalance)}</span>,
    },
    {
      header: "Given",
      className: "text-right",
      render: (s) => <span className="text-success">{formatCurrency(s.balance.givenBalance)}</span>,
    },
    {
      header: "Remaining",
      className: "text-right",
      render: (s) => (
        <span className={s.balance.remainingBalance > 0 ? "font-medium text-danger" : "font-medium text-success"}>
          {formatCurrency(s.balance.remainingBalance)}
        </span>
      ),
    },
    {
      header: "Status",
      render: (s) => <Badge tone={toneForStatus(s.status)}>{s.status === "ACTIVE" ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: "Actions",
      className: "text-right",
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <ToggleSwitch
            checked={s.status === "ACTIVE"}
            onChange={() => handleToggleStatus(s)}
            disabled={busyId === s.id}
            label={s.status === "ACTIVE" ? "Deactivate supplier" : "Activate supplier"}
          />
          <IconButton label="View details" onClick={() => setDetailSupplier(s)}>
            <Eye size={15} />
          </IconButton>
          <IconButton label="Edit supplier" onClick={() => setFormModal({ supplier: s })}>
            <Pencil size={15} />
          </IconButton>
          <IconButton label="Delete supplier" danger onClick={() => setDeleteTarget(s)}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-title text-gray-900">Suppliers</h2>
          <p className="text-sm text-gray-400">
            Supplier accounts and balances
            {!isLoading && !loadError && ` · ${suppliers.length} suppliers`}
          </p>
        </div>
        <Button onClick={() => setFormModal({})}>
          <Plus size={16} />
          Add supplier
        </Button>
      </div>

      <Card className="p-0">
        <div className="border-b border-gray-100 p-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full rounded-control border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>

        {loadError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-danger">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={loadSuppliers}>
              Try again
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredSuppliers}
            keyExtractor={(s) => s.id}
            isLoading={isLoading}
            emptyMessage={search ? "No suppliers match your search." : "No suppliers yet."}
          />
        )}
      </Card>

      {formModal && (
        <SupplierFormModal
          key={formModal.supplier?.id ?? "new"}
          supplier={formModal.supplier}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
        />
      )}

      {detailSupplier && (
        <SupplierDetailModal supplier={detailSupplier} onClose={() => setDetailSupplier(null)} />
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Delete supplier?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} isLoading={isDeleting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Permanently delete <span className="font-semibold">{deleteTarget?.name}</span>? This cannot be undone.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          If this supplier has transaction history, deletion is blocked — deactivate it instead.
        </p>
      </Modal>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={
        "rounded-control p-2 text-gray-400 transition-colors " +
        (danger ? "hover:bg-danger-light hover:text-danger" : "hover:bg-gray-100 hover:text-gray-700")
      }
    >
      {children}
    </button>
  );
}