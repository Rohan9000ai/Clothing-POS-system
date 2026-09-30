import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Modal,
  Select,
  Table,
  ToggleSwitch,
  toneForStatus,
  type TableColumn,
} from "@muzammil-pos/ui";
import type { Product, Category } from "@muzammil-pos/types";
import { formatCurrency, debounce } from "@muzammil-pos/utils";
import { categoriesApi, productsApi } from "../../services/inventory";
import { API_ORIGIN } from "../../services/http";
import { useToastStore } from "../../store/toastStore";
import { ProductWizardModal } from "./ProductWizardModal";

// Placeholder until the Settings module exists — matches the backend
// default (settings.lowStockThreshold, see docs/database/schema.md).
const LOW_STOCK_THRESHOLD = 5;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function totalStock(product: Product): number {
  return (product.variants ?? []).reduce((sum, v) => sum + v.quantity, 0);
}

function hasLowStock(product: Product): boolean {
  return (product.variants ?? []).some((v) => v.status === "ACTIVE" && v.quantity < LOW_STOCK_THRESHOLD);
}

function isOutOfStock(product: Product): boolean {
  const activeVariants = (product.variants ?? []).filter((v) => v.status === "ACTIVE");
  return activeVariants.length > 0 && activeVariants.every((v) => v.quantity === 0);
}

export function InventoryScreen() {
  const push = useToastStore((s) => s.push);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const [wizardState, setWizardState] = useState<{ product?: Product } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const debouncedSetSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearch(value);
        setPage(1);
      }, 300),
    []
  );

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {
      // Category load failure isn't fatal for the list page — the filter
      // dropdown just has no options; product listing still works.
    });
  }, []);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await productsApi.list({
        page,
        pageSize: 20,
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        status: statusFilter || undefined,
      });
      setProducts(result.items);
      setMeta(result.meta);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function replaceProduct(updated: Product) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handleSaved(saved: Product, mode: "create" | "edit") {
    if (mode === "create") {
      push("success", `Product "${saved.name}" was added.`);
      void loadProducts();
    } else {
      replaceProduct(saved);
      push("success", `Product "${saved.name}" was updated.`);
    }
  }

  async function handleToggleStatus(product: Product) {
    const next = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyId(product.id);
    try {
      const updated = await productsApi.setStatus(product.id, next);
      replaceProduct(updated);
      push("success", `"${product.name}" is now ${next === "ACTIVE" ? "active" : "inactive"}.`);
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
      await productsApi.remove(deleteTarget.id);
      push("success", `Product "${deleteTarget.name}" was deleted.`);
      setDeleteTarget(null);
      void loadProducts();
    } catch (err) {
      // e.g. product has variants/sale history — server message explains.
      push("error", err instanceof Error ? err.message : "Could not delete product.");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const categoryOptions = useMemo(
    () => [{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories]
  );

  const columns: TableColumn<Product>[] = [
    {
      header: "Product",
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-gray-300">
            {p.primaryImageUrl ? (
              <img
                src={`${API_ORIGIN}${p.primaryImageUrl}`}
                alt={p.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageOff size={16} />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{p.name}</p>
            <p className="text-xs text-gray-400">{p.productCode}</p>
          </div>
        </div>
      ),
    },
    { header: "Category", render: (p) => <span className="text-gray-600">{p.category?.name ?? "—"}</span> },
    {
      header: "Price",
      className: "text-right",
      render: (p) => <span className="font-medium text-gray-900">{formatCurrency(p.basePrice)}</span>,
    },
    {
      header: "Stock",
      className: "text-right",
      render: (p) => {
        const stock = totalStock(p);
        if (isOutOfStock(p)) return <Badge tone="danger">Out of stock</Badge>;
        if (hasLowStock(p)) {
          return (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-gray-700">{stock}</span>
              <Badge tone="warning">Low stock</Badge>
            </span>
          );
        }
        return <span className="text-gray-700">{stock}</span>;
      },
    },
    {
      header: "Status",
      render: (p) => <Badge tone={toneForStatus(p.status)}>{p.status === "ACTIVE" ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: "Actions",
      className: "text-right",
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <ToggleSwitch
            checked={p.status === "ACTIVE"}
            onChange={() => handleToggleStatus(p)}
            disabled={busyId === p.id}
            label={p.status === "ACTIVE" ? "Deactivate product" : "Activate product"}
          />
          <IconButton label="Edit product" onClick={() => setWizardState({ product: p })}>
            <Pencil size={15} />
          </IconButton>
          <IconButton label="Delete product" danger onClick={() => setDeleteTarget(p)}>
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
          <h2 className="text-title text-gray-900">Inventory</h2>
          <p className="text-sm text-gray-400">
            Products, sizes, colors and stock levels
            {!isLoading && !loadError && ` · ${meta.totalItems} products`}
          </p>
        </div>
        <Button onClick={() => setWizardState({})}>
          <Plus size={16} />
          Add product
        </Button>
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <div className="relative max-w-sm flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                debouncedSetSearch(e.target.value);
              }}
              placeholder="Search by name or product code…"
              className="w-full rounded-control border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            options={categoryOptions}
            className="w-48"
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
            className="w-40"
          />
        </div>

        {loadError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-danger">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={loadProducts}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={products}
              keyExtractor={(p) => p.id}
              isLoading={isLoading}
              emptyMessage={
                search || categoryFilter || statusFilter
                  ? "No products match your filters."
                  : "No products yet. Add your first product to get started."
              }
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

      {wizardState && (
        <ProductWizardModal
          key={wizardState.product?.id ?? "new"}
          product={wizardState.product}
          categories={categories}
          onClose={() => {
            setWizardState(null);
            void loadProducts();
          }}
          onSaved={handleSaved}
        />
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Delete product?"
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
          Permanently delete <span className="font-semibold">{deleteTarget?.name}</span> (
          {deleteTarget?.productCode})? This cannot be undone.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          If this product has sizes/colors or sales history, deletion is blocked — deactivate it instead.
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