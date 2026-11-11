import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Input, Modal, Table, ToggleSwitch, toneForStatus, type TableColumn } from "@muzammil-pos/ui";
import { createCategorySchema } from "@muzammil-pos/validation";
import { categoryAdminApi, type CategoryWithCount } from "../../services/categories";
import { useToastStore } from "../../store/toastStore";
import { requestDelete } from "../../store/confirmDeleteStore";
import { getFieldErrors } from "../../utils/formErrors";

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category?: CategoryWithCount;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = createCategorySchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Category name is required.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      if (category) await categoryAdminApi.rename(category.id, parsed.data.name);
      else await categoryAdminApi.create(parsed.data);
      onSaved(category ? `Category renamed to "${parsed.data.name}".` : `Category "${parsed.data.name}" was added.`);
    } catch (err) {
      setError(getFieldErrors(err).name ?? (err instanceof Error ? err.message : "Could not save the category."));
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={() => !isSaving && onClose()}
      title={category ? "Rename category" : "Add category"}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" isLoading={isSaving}>
            {category ? "Save" : "Add category"}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} noValidate>
        <Input
          label="Category name"
          placeholder="e.g. Bridal Wear"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          error={error ?? undefined}
          disabled={isSaving}
          autoFocus
        />
      </form>
    </Modal>
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
        "rounded-control p-2 transition-colors " +
        (danger
          ? "text-gray-400 hover:bg-danger-light hover:text-danger"
          : "text-gray-400 hover:bg-gray-100 hover:text-gray-700")
      }
    >
      {children}
    </button>
  );
}

export function CategoriesScreen() {
  const push = useToastStore((s) => s.push);

  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formModal, setFormModal] = useState<{ category?: CategoryWithCount } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setCategories(await categoryAdminApi.list());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggle(category: CategoryWithCount) {
    const next = category.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyId(category.id);
    try {
      await categoryAdminApi.setStatus(category.id, next);
      setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, status: next } : c)));
      push("success", `"${category.name}" is now ${next === "ACTIVE" ? "active" : "inactive"}.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not change the status.");
    } finally {
      setBusyId(null);
    }
  }

  function askDelete(category: CategoryWithCount) {
    if (category.productCount > 0) {
      push(
        "error",
        `"${category.name}" still has ${category.productCount} product${category.productCount === 1 ? "" : "s"}. Move or delete those products first.`
      );
      return;
    }
    requestDelete({
      itemName: category.name,
      run: async (password) => {
        await categoryAdminApi.remove(category.id, password);
        setCategories((prev) => prev.filter((c) => c.id !== category.id));
        push("success", `Category "${category.name}" was deleted.`);
      },
    });
  }

  const columns: TableColumn<CategoryWithCount>[] = [
    { header: "Category", render: (c) => <span className="font-medium text-gray-900">{c.name}</span> },
    {
      header: "Products",
      className: "text-right",
      render: (c) => <span className="text-gray-600">{c.productCount}</span>,
    },
    {
      header: "Status",
      render: (c) => <Badge tone={toneForStatus(c.status)}>{c.status === "ACTIVE" ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: "Actions",
      className: "text-right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <ToggleSwitch
            checked={c.status === "ACTIVE"}
            onChange={() => handleToggle(c)}
            disabled={busyId === c.id}
            label={c.status === "ACTIVE" ? "Deactivate category" : "Activate category"}
          />
          <IconButton label="Rename category" onClick={() => setFormModal({ category: c })}>
            <Pencil size={15} />
          </IconButton>
          <IconButton label="Delete category" danger onClick={() => askDelete(c)}>
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
          <h2 className="text-title text-gray-900">Categories</h2>
          <p className="text-sm text-gray-400">
            Your own product categories
            {!isLoading && !loadError && ` · ${categories.length} categories`}
          </p>
        </div>
        <Button onClick={() => setFormModal({})}>
          <Plus size={16} />
          Add category
        </Button>
      </div>

      <p className="rounded-control bg-gray-50 px-3 py-2 text-xs text-gray-500">
        These are the categories you can pick when you add a product in Inventory. Only active categories are offered
        there. A category that still has products cannot be deleted: move those products to another category first.
      </p>

      <Card className="p-0">
        {loadError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-danger">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={load}>
              Try again
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={categories}
            keyExtractor={(c) => c.id}
            isLoading={isLoading}
            emptyMessage='No categories yet. Click "Add category" to create your first one.'
          />
        )}
      </Card>

      {formModal && (
        <CategoryFormModal
          key={formModal.category?.id ?? "new"}
          category={formModal.category}
          onClose={() => setFormModal(null)}
          onSaved={(message) => {
            push("success", message);
            setFormModal(null);
            void load();
          }}
        />
      )}
    </div>
  );
}