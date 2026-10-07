import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Modal, Table, ToggleSwitch, toneForStatus, type TableColumn } from "@muzammil-pos/ui";
import { formatCurrency, formatDate } from "@muzammil-pos/utils";
import { salesmenAdminApi, type SalesmanWithStats } from "../../services/salesmenAdmin";
import { useToastStore } from "../../store/toastStore";
import { SalesmanFormModal } from "./SalesmanFormModal";

export function SalesmenScreen() {
  const push = useToastStore((s) => s.push);

  const [salesmen, setSalesmen] = useState<SalesmanWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formModal, setFormModal] = useState<{ salesman?: SalesmanWithStats } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalesmanWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSalesmen = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setSalesmen(await salesmenAdminApi.list());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load salesmen.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSalesmen();
  }, [loadSalesmen]);

  const activeCount = useMemo(() => salesmen.filter((s) => s.status === "ACTIVE").length, [salesmen]);

  function replaceSalesman(updated: SalesmanWithStats) {
    setSalesmen((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleSaved(saved: SalesmanWithStats, mode: "create" | "edit") {
    if (mode === "create") {
      push("success", `Salesman "${saved.name}" was added.`);
      void loadSalesmen();
    } else {
      replaceSalesman(saved);
      push("success", `Salesman "${saved.name}" was updated.`);
    }
    setFormModal(null);
  }

  async function handleToggleStatus(salesman: SalesmanWithStats) {
    const next = salesman.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyId(salesman.id);
    try {
      const updated = await salesmenAdminApi.setStatus(salesman.id, next);
      replaceSalesman(updated);
      push("success", `"${salesman.name}" is now ${next === "ACTIVE" ? "active" : "inactive"}.`);
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
      await salesmenAdminApi.remove(deleteTarget.id);
      setSalesmen((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      push("success", `Salesman "${deleteTarget.name}" was deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      // e.g. salesman has sales/expense history — server message explains.
      push("error", err instanceof Error ? err.message : "Could not delete salesman.");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: TableColumn<SalesmanWithStats>[] = [
    {
      header: "ID",
      render: (s) => <span className="font-mono text-xs text-gray-400">{s.id.slice(-8).toUpperCase()}</span>,
    },
    {
      header: "Salesperson / CNIC",
      render: (s) => (
        <div>
          <p className="font-medium text-gray-900">{s.name}</p>
          <p className="text-xs text-gray-400">{s.cnic}</p>
        </div>
      ),
    },
    { header: "Phone Number", render: (s) => <span className="text-gray-600">{s.phone}</span> },
    { header: "Join Date", render: (s) => <span className="text-gray-600">{formatDate(s.joinDate)}</span> },
    {
      header: "Base Salary",
      className: "text-right",
      render: (s) => <span className="text-gray-700">{formatCurrency(s.salary)}</span>,
    },
    {
      header: "Today's Sales",
      className: "text-right",
      render: (s) => (
        <div>
          <span className="font-medium text-brand">{formatCurrency(s.todaySales)}</span>
          {s.todaySalesCount > 0 && (
            <p className="text-xs text-gray-400">{s.todaySalesCount} bill{s.todaySalesCount > 1 ? "s" : ""}</p>
          )}
        </div>
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
            label={s.status === "ACTIVE" ? "Deactivate salesman" : "Activate salesman"}
          />
          <IconButton label="Edit salesman" onClick={() => setFormModal({ salesman: s })}>
            <Pencil size={15} />
          </IconButton>
          <IconButton label="Delete salesman" danger onClick={() => setDeleteTarget(s)}>
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
          <h2 className="text-title text-gray-900">Salesmen</h2>
          <p className="text-sm text-gray-400">
            Sales staff and performance
            {!isLoading && !loadError && ` · ${salesmen.length} salesmen, ${activeCount} active`}
          </p>
        </div>
        <Button onClick={() => setFormModal({})}>
          <Plus size={16} />
          Add salesman
        </Button>
      </div>

      <Card className="p-0">
        {loadError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-danger">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={loadSalesmen}>
              Try again
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={salesmen}
            keyExtractor={(s) => s.id}
            isLoading={isLoading}
            emptyMessage="No salesmen yet. Add your first salesperson to get started."
          />
        )}
      </Card>

      {formModal && (
        <SalesmanFormModal
          key={formModal.salesman?.id ?? "new"}
          salesman={formModal.salesman}
          allSalesmen={salesmen}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
        />
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Delete salesman?"
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
          If this salesman has sales or expense history, deletion is blocked — deactivate instead.
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