import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, Eye, Printer, Search } from "lucide-react";
import { Badge, Button, Card, Select, Table, toneForStatus, type TableColumn } from "@muzammil-pos/ui";
import { formatCurrency, formatDateTime, debounce } from "@muzammil-pos/utils";
import type { User, Settings } from "@muzammil-pos/types";
import { salesApi, type SaleDetail, type SaleListParams } from "../../services/sales";
import { usersApi } from "../../services/users";
import { salesmenAdminApi, type SalesmanWithStats } from "../../services/salesmenAdmin";
import { settingsApi } from "../../services/settings";
import { buildInvoiceHtml } from "../../utils/receiptTemplates";
import { useToastStore } from "../../store/toastStore";
import { VoidSaleModal } from "./VoidSaleModal";

const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "All payment methods" },
  { value: "CASH", label: "Cash" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "VOID", label: "Void" },
];

function methodLabel(method: string): string {
  return method.replace("_", " ");
}

export function SalesScreen() {
  const navigate = useNavigate();
  const push = useToastStore((s) => s.push);

  const [sales, setSales] = useState<SaleDetail[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cashierId, setCashierId] = useState("");
  const [salesmanId, setSalesmanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [cashiers, setCashiers] = useState<User[]>([]);
  const [salesmen, setSalesmen] = useState<SalesmanWithStats[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [voidTarget, setVoidTarget] = useState<SaleDetail | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearch(value);
        setPage(1);
      }, 300),
    []
  );

  useEffect(() => {
    usersApi.list().then(setCashiers).catch(() => {
      // Non-fatal: the cashier filter dropdown just stays empty if this fails.
    });
    salesmenAdminApi.list().then(setSalesmen).catch(() => {
      // Non-fatal: the salesman filter dropdown just stays empty if this fails.
    });
    settingsApi.get().then(setSettings).catch(() => {
      // Non-fatal until "Print" is clicked, at which point we show an error.
    });
  }, []);

  const loadSales = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params: SaleListParams = {
        page,
        pageSize: 20,
        search: search || undefined,
        cashierId: cashierId || undefined,
        salesmanId: salesmanId || undefined,
        paymentMethod: (paymentMethod || undefined) as SaleListParams["paymentMethod"],
        status: (status || undefined) as SaleListParams["status"],
        dateFrom: dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined,
        dateTo: dateTo ? `${dateTo}T23:59:59.999Z` : undefined,
      };
      const result = await salesApi.list(params);
      setSales(result.items);
      setMeta(result.meta);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load sales.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, cashierId, salesmanId, paymentMethod, status, dateFrom, dateTo]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  function replaceSale(updated: SaleDetail) {
    setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  async function handlePrint(sale: SaleDetail) {
    if (!settings) {
      push("error", "Shop settings are still loading. Please try again in a moment.");
      return;
    }
    setPrintingId(sale.id);
    try {
      const html = buildInvoiceHtml(sale, settings);
      const result = await window.muzammilPOS.print(html);
      if (result.success) {
        push("success", `Invoice ${sale.billNo} sent to printer.`);
      } else {
        push("error", result.error ?? "Printing failed. Please try again.");
      }
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Printing failed. Please try again.");
    } finally {
      setPrintingId(null);
    }
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setCashierId("");
    setSalesmanId("");
    setPaymentMethod("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const cashierOptions = [
    { value: "", label: "All cashiers" },
    ...cashiers.map((c) => ({ value: c.id, label: c.fullName })),
  ];
  const salesmanOptions = [
    { value: "", label: "All salesmen" },
    ...salesmen.map((s) => ({ value: s.id, label: s.name })),
  ];

  const hasActiveFilters =
    !!search || !!cashierId || !!salesmanId || !!paymentMethod || !!status || !!dateFrom || !!dateTo;

  const columns: TableColumn<SaleDetail>[] = [
    { header: "Bill ID", render: (s) => <span className="font-medium text-brand">{s.billNo}</span> },
    { header: "Date", render: (s) => <span className="text-gray-600">{formatDateTime(s.saleDate)}</span> },
    { header: "Salesman", render: (s) => <span className="text-gray-600">{s.salesman?.name ?? "—"}</span> },
    { header: "Customer", render: (s) => <span className="text-gray-600">{s.customer.name}</span> },
    {
      header: "Net Total",
      className: "text-right",
      render: (s) => <span className="font-medium text-gray-900">{formatCurrency(s.netTotal)}</span>,
    },
    {
      header: "Payment Method",
      render: (s) =>
        (s.payments ?? []).length === 0 ? (
          <Badge tone="neutral">Unpaid</Badge>
        ) : (
          <div className="flex flex-wrap gap-1">
            {Array.from(new Set((s.payments ?? []).map((p) => p.method))).map((m) => (
              <Badge key={m} tone="neutral">
                {methodLabel(m)}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      header: "Status",
      render: (s) => (
        <Badge tone={toneForStatus(s.saleStatus)}>{s.saleStatus === "COMPLETED" ? "Completed" : "Void"}</Badge>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton label="View invoice" onClick={() => navigate(`/invoice/${s.id}`)}>
            <Eye size={15} />
          </IconButton>
          <IconButton label="Print invoice" onClick={() => handlePrint(s)} disabled={printingId === s.id}>
            <Printer size={15} />
          </IconButton>
          <IconButton
            label={s.saleStatus === "VOID" ? "Already voided" : "Void sale"}
            danger
            disabled={s.saleStatus === "VOID"}
            onClick={() => setVoidTarget(s)}
          >
            <Ban size={15} />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-title text-gray-900">Sales</h2>
        <p className="text-sm text-gray-400">
          Invoices, payments and sales history
          {!isLoading && !loadError && ` · ${meta.totalItems} sales`}
        </p>
      </div>

      <Card className="p-0">
        <div className="space-y-3 border-b border-gray-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-xs flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  debouncedSetSearch(e.target.value);
                }}
                placeholder="Search by bill number…"
                className="w-full rounded-control border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <Select
              value={cashierId}
              onChange={(e) => {
                setCashierId(e.target.value);
                setPage(1);
              }}
              options={cashierOptions}
              className="w-40"
            />
            <Select
              value={salesmanId}
              onChange={(e) => {
                setSalesmanId(e.target.value);
                setPage(1);
              }}
              options={salesmanOptions}
              className="w-40"
            />
            <Select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              options={PAYMENT_METHOD_OPTIONS}
              className="w-44"
            />
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
              className="w-36"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded-control border border-gray-300 px-2 py-1.5 text-sm"
              />
              <span>To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="rounded-control border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {loadError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-danger">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={loadSales}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={sales}
              keyExtractor={(s) => s.id}
              isLoading={isLoading}
              emptyMessage={hasActiveFilters ? "No sales match your filters." : "No sales recorded yet."}
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

      {voidTarget && (
        <VoidSaleModal
          sale={voidTarget}
          onClose={() => setVoidTarget(null)}
          onVoided={(voided) => {
            replaceSale(voided);
            push("success", `Sale ${voided.billNo} was voided and stock was restored.`);
            setVoidTarget(null);
          }}
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