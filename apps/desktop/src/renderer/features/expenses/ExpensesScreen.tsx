import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, Select, Table, toneForStatus, type TableColumn } from "@muzammil-pos/ui";
import { formatCurrency } from "@muzammil-pos/utils";
import type { ExpenseStatus, ExpenseType, Settings } from "@muzammil-pos/types";
import { expensesApi, type ExpenseDetail, type ExpenseListParams } from "../../services/expenses";
import { suppliersApi, type SupplierWithBalance } from "../../services/suppliers";
import { salesmenAdminApi, type SalesmanWithStats } from "../../services/salesmenAdmin";
import { settingsApi } from "../../services/settings";
import { useToastStore } from "../../store/toastStore";
import { ExpenseFormModal } from "./ExpenseFormModal";
import { DeleteExpenseModal } from "./DeleteExpenseModal";
import { buildExpenseReportHtml } from "./expenseReport";
import { EXPENSE_TYPE_LABELS, EXPENSE_TYPE_OPTIONS, PAYMENT_METHOD_LABELS } from "./expenseMeta";
import { describeRange, formatExpenseDate, resolveRange, type RangePreset } from "./expenseRange";

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "custom", label: "Custom range" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active only" },
  { value: "VOID", label: "Deleted only" },
  { value: "", label: "Active and deleted" },
];

const TYPE_FILTER_OPTIONS = [{ value: "", label: "All types" }, ...EXPENSE_TYPE_OPTIONS];

export function ExpensesScreen() {
  const push = useToastStore((s) => s.push);

  const [expenses, setExpenses] = useState<ExpenseDetail[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });
  const [activeTotal, setActiveTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [preset, setPreset] = useState<RangePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [page, setPage] = useState(1);

  const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
  const [salesmen, setSalesmen] = useState<SalesmanWithStats[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [formModal, setFormModal] = useState<{ expense?: ExpenseDetail } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseDetail | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Guards against a slow, older request overwriting a newer one when filters change quickly.
  const requestIdRef = useRef(0);

  const range = useMemo(() => resolveRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const rangeLabel = describeRange(range);

  const filterParams = useMemo<Omit<ExpenseListParams, "page" | "pageSize">>(
    () => ({
      type: (typeFilter || undefined) as ExpenseType | undefined,
      status: (statusFilter || undefined) as ExpenseStatus | undefined,
      dateFrom: range.from ? `${range.from}T00:00:00.000Z` : undefined,
      dateTo: range.to ? `${range.to}T23:59:59.999Z` : undefined,
    }),
    [typeFilter, statusFilter, range.from, range.to]
  );

  useEffect(() => {
    suppliersApi.list().then(setSuppliers).catch(() => {
      // Non-fatal: the supplier link dropdown just stays empty.
    });
    salesmenAdminApi.list().then(setSalesmen).catch(() => {
      // Non-fatal: the salesman link dropdown just stays empty.
    });
    settingsApi.get().then(setSettings).catch(() => {
      // Non-fatal until Export PDF is clicked, which shows its own message.
    });
  }, []);

  const loadExpenses = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await expensesApi.list({ ...filterParams, page, pageSize: 20 });
      if (requestId !== requestIdRef.current) return;

      // The current page no longer exists (e.g. the last row on it was deleted).
      if (result.items.length === 0 && page > 1 && result.meta.totalPages < page) {
        setPage(result.meta.totalPages);
        return;
      }

      setExpenses(result.items);
      setMeta(result.meta);
      setActiveTotal(result.summary.activeTotal);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setLoadError(err instanceof Error ? err.message : "Failed to load expenses.");
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [filterParams, page]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  function handleSaved(saved: ExpenseDetail, mode: "create" | "edit") {
    const savedDay = saved.expenseDate.slice(0, 10);
    const outsideRange = (range.from && savedDay < range.from) || (range.to && savedDay > range.to);

    const verb = mode === "create" ? "added" : "updated";
    push(
      "success",
      outsideRange
        ? `Expense "${saved.title}" was ${verb}. It falls outside the selected dates, so change the range to see it.`
        : `Expense "${saved.title}" was ${verb}.`
    );
    setFormModal(null);
    void loadExpenses();
  }

  function handleDeleted(deleted: ExpenseDetail) {
    push("success", `Expense "${deleted.title}" was deleted.`);
    setDeleteTarget(null);
    void loadExpenses();
  }

  async function handleExport() {
    if (!settings) {
      push("error", "Shop settings are still loading. Please try again in a moment.");
      return;
    }

    setIsExporting(true);
    try {
      const all = await expensesApi.listAll(filterParams);
      if (all.length === 0) {
        push("error", "There are no expenses in this selection to export.");
        return;
      }

      const filterLabels = [
        ...(typeFilter ? [`Type: ${EXPENSE_TYPE_LABELS[typeFilter as ExpenseType]}`] : []),
        `Showing: ${STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "Active only"}`,
      ];

      const html = buildExpenseReportHtml({ expenses: all, settings, rangeLabel, filterLabels });
      const fileName = `muzammil-expenses_${range.from ?? "start"}_to_${range.to ?? "end"}.pdf`;

      const result = await window.muzammilPOS.savePdf(html, fileName);
      if (result.success) {
        push("success", "Expense report saved as PDF.");
      } else if (!result.canceled) {
        push("error", result.error ?? "Could not create the PDF. Please try again.");
      }
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not create the PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  const summaryText =
    statusFilter === "VOID"
      ? `${meta.totalItems} deleted ${meta.totalItems === 1 ? "entry" : "entries"}`
      : `${meta.totalItems} ${meta.totalItems === 1 ? "entry" : "entries"} · ${formatCurrency(activeTotal)} total${
          statusFilter === "" ? " (deleted excluded)" : ""
        }`;

  const columns: TableColumn<ExpenseDetail>[] = [
    {
      header: "Date",
      render: (e) => <span className="whitespace-nowrap text-gray-600">{formatExpenseDate(e.expenseDate)}</span>,
    },
    {
      header: "Title",
      render: (e) => {
        const links = [
          e.supplier ? `Supplier: ${e.supplier.name}` : null,
          e.salesman ? `Salesman: ${e.salesman.name}` : null,
        ].filter(Boolean);
        return (
          <div>
            <p className={clsx("font-medium", e.status === "VOID" ? "text-gray-400 line-through" : "text-gray-900")}>
              {e.title}
            </p>
            {links.length > 0 && <p className="text-xs text-gray-400">{links.join(" · ")}</p>}
          </div>
        );
      },
    },
    { header: "Type", render: (e) => <Badge tone="brand">{EXPENSE_TYPE_LABELS[e.type]}</Badge> },
    {
      header: "Method",
      render: (e) => (
        <div>
          <span className="text-gray-600">{PAYMENT_METHOD_LABELS[e.paymentMethod]}</span>
          {e.referenceNo && <p className="text-xs text-gray-400">{e.referenceNo}</p>}
        </div>
      ),
    },
    {
      header: "Amount",
      className: "text-right",
      render: (e) => (
        <span className={clsx("font-medium", e.status === "VOID" ? "text-gray-400 line-through" : "text-gray-900")}>
          {formatCurrency(e.amount)}
        </span>
      ),
    },
    {
      header: "Notes",
      render: (e) =>
        e.notes ? (
          <span className="block max-w-[220px] truncate text-xs text-gray-500" title={e.notes}>
            {e.notes}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      header: "Status",
      render: (e) => (
        <Badge tone={toneForStatus(e.status)}>{e.status === "ACTIVE" ? "Active" : "Deleted"}</Badge>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      render: (e) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            label={e.status === "VOID" ? "Deleted expenses can't be edited" : "Edit expense"}
            disabled={e.status === "VOID"}
            onClick={() => setFormModal({ expense: e })}
          >
            <Pencil size={15} />
          </IconButton>
          <IconButton
            label={e.status === "VOID" ? "Already deleted" : "Delete expense"}
            danger
            disabled={e.status === "VOID"}
            onClick={() => setDeleteTarget(e)}
          >
            <Trash2 size={15} />
          </IconButton>
        </div>
      ),
    },
  ];

  const emptyMessage =
    statusFilter === "VOID"
      ? "No deleted expenses in this period."
      : typeFilter
        ? "No expenses of this type in this period."
        : "No expenses recorded in this period.";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-title text-gray-900">Expenses</h2>
          <p className="text-sm text-gray-400">Record, review and export every business expense</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExport} isLoading={isExporting} disabled={isLoading}>
            <FileDown size={16} />
            Export PDF
          </Button>
          <Button onClick={() => setFormModal({})}>
            <Plus size={16} />
            Add expense
          </Button>
        </div>
      </div>

      <Card className="p-0">
        <div className="space-y-3 border-b border-gray-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-section text-gray-900">Expense history</h3>
              <p className="text-xs text-gray-400">
                {isLoading && expenses.length === 0 ? "Loading…" : summaryText} · {rangeLabel}
              </p>
            </div>

            <div className="inline-flex rounded-control border border-gray-200 bg-gray-50 p-0.5">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    setPreset(p.value);
                    setPage(1);
                  }}
                  className={clsx(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    preset === p.value ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {preset === "custom" && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>From</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => {
                    setCustomFrom(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-control border border-gray-300 px-2 py-1.5 text-sm"
                />
                <span>To</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => {
                    setCustomTo(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-control border border-gray-300 px-2 py-1.5 text-sm"
                />
              </div>
            )}
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              options={TYPE_FILTER_OPTIONS}
              className="w-48"
            />
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
              className="w-48"
            />
          </div>
        </div>

        {loadError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-danger">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={loadExpenses}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={expenses}
              keyExtractor={(e) => e.id}
              isLoading={isLoading}
              emptyMessage={emptyMessage}
            />
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-400">
                  Page {meta.page} of {meta.totalPages} · {meta.totalItems} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={meta.page <= 1}
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {formModal && (
        <ExpenseFormModal
          key={formModal.expense?.id ?? "new"}
          expense={formModal.expense}
          suppliers={suppliers}
          salesmen={salesmen}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteExpenseModal
          expense={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={
        "rounded-control p-2 text-gray-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
        (danger ? "hover:bg-danger-light hover:text-danger" : "hover:bg-gray-100 hover:text-gray-700")
      }
    >
      {children}
    </button>
  );
}