import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Modal } from "@muzammil-pos/ui";
import type { Product, Supplier } from "@muzammil-pos/types";
import { createSupplierPurchaseSchema } from "@muzammil-pos/validation";
import { formatCurrency, toPaisa } from "@muzammil-pos/utils";
import { productsApi } from "../../services/inventory";
import { supplierPurchasesApi, type SupplierPurchaseDetail } from "../../services/supplierPurchases";
import { getFieldErrors } from "../../utils/formErrors";
import { toLocalYmd } from "../expenses/expenseRange";

interface PurchaseFormModalProps {
  supplier: Pick<Supplier, "id" | "name">;
  onClose: () => void;
  onSaved: (purchase: SupplierPurchaseDetail) => void;
}

interface Line {
  key: number;
  productId: string;
  size: string;
  color: string;
  quantity: string;
  unitCost: string; // rupees, per piece
}

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const cellInput =
  "w-full rounded-control border border-gray-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const gridCols = "grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_2rem] gap-2";

let nextLineKey = 1;
function emptyLine(): Line {
  return { key: nextLineKey++, productId: "", size: "", color: "", quantity: "", unitCost: "" };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function lineQty(line: Line): number {
  const n = Number(line.quantity);
  return line.quantity !== "" && Number.isInteger(n) && n > 0 ? n : 0;
}

function lineCostPaisa(line: Line): number {
  const n = Number(line.unitCost);
  return line.unitCost !== "" && !Number.isNaN(n) && n > 0 ? toPaisa(n) : 0;
}

export function PurchaseFormModal({ supplier, onClose, onSaved }: PurchaseFormModalProps) {
  const [purchaseDate, setPurchaseDate] = useState(toLocalYmd(new Date()));
  const [billNo, setBillNo] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()]);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    productsApi
      .list({ status: "ACTIVE", page: 1, pageSize: 500 })
      .then((res) => {
        if (!cancelled) setProducts([...res.items].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((err) => {
        if (!cancelled) setProductsError(err instanceof Error ? err.message : "Could not load products.");
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const totalPieces = lines.reduce((sum, l) => sum + lineQty(l), 0);
  const grandTotal = lines.reduce((sum, l) => sum + lineQty(l) * lineCostPaisa(l), 0);

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  function sizeSuggestions(productId: string): string[] {
    const existing = (productById.get(productId)?.variants ?? []).map((v) => v.size);
    return [...new Set([...existing, ...STANDARD_SIZES])];
  }

  function colorSuggestions(productId: string): string[] {
    return [...new Set((productById.get(productId)?.variants ?? []).map((v) => v.color))];
  }

  function describeLine(line: Line): { warn: boolean; text: string } | null {
    const product = productById.get(line.productId);
    if (!product || !line.size.trim() || !line.color.trim()) return null;

    const existing = (product.variants ?? []).find(
      (v) => normalize(v.size) === normalize(line.size) && normalize(v.color) === normalize(line.color)
    );
    if (!existing) return { warn: false, text: "New size / color. It will be created automatically." };
    if (existing.status !== "ACTIVE") {
      return { warn: true, text: `${existing.size} / ${existing.color} is inactive. Activate it in Inventory first.` };
    }
    const qty = lineQty(line);
    return {
      warn: false,
      text:
        qty > 0
          ? `In stock: ${existing.quantity} → ${existing.quantity + qty} after this bill.`
          : `In stock now: ${existing.quantity}.`,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const nextLineErrors: Record<number, string> = {};
    const nextErrors: Record<string, string> = {};

    // The same product / size / color twice on one bill.
    const seen = new Map<string, number>();
    lines.forEach((line, index) => {
      if (!line.productId || !line.size.trim() || !line.color.trim()) return;
      const key = `${line.productId}|${normalize(line.size)}|${normalize(line.color)}`;
      const first = seen.get(key);
      if (first !== undefined) {
        nextLineErrors[line.key] = `Same product, size and color as line ${first + 1}. Combine them into one line.`;
      } else {
        seen.set(key, index);
      }
    });

    const parsed = createSupplierPurchaseSchema.safeParse({
      purchaseDate,
      billNo: billNo.trim() || undefined,
      notes: notes.trim() || undefined,
      items: lines.map((l) => ({
        productId: l.productId,
        size: l.size.trim(),
        color: l.color.trim(),
        quantity: l.quantity === "" ? NaN : Number(l.quantity),
        unitCost: l.unitCost === "" ? NaN : toPaisa(Number(l.unitCost)),
      })),
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const [first, second] = issue.path;
        if (first === "items" && typeof second === "number") {
          const lineKey = lines[second]?.key;
          if (lineKey !== undefined && !nextLineErrors[lineKey]) nextLineErrors[lineKey] = issue.message;
        } else {
          const field = String(first ?? "form");
          if (!nextErrors[field]) nextErrors[field] = issue.message;
        }
      }
    }

    if (!parsed.success || Object.keys(nextLineErrors).length > 0) {
      setErrors(nextErrors);
      setLineErrors(nextLineErrors);
      return;
    }
    setErrors({});
    setLineErrors({});

    setIsSubmitting(true);
    try {
      const saved = await supplierPurchasesApi.create(supplier.id, parsed.data);
      onSaved(saved);
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else setFormError(err instanceof Error ? err.message : "Could not save the bill.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = !productsLoading && !productsError && products.length > 0;

  return (
    <Modal
      isOpen
      onClose={() => !isSubmitting && onClose()}
      title={`New stock bill — ${supplier.name}`}
      size="lg"
      footer={
        <>
          <div className="mr-auto text-sm text-gray-500">
            {totalPieces} {totalPieces === 1 ? "piece" : "pieces"} ·{" "}
            <span className="font-semibold text-gray-900">Total {formatCurrency(grandTotal)}</span>
          </div>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="purchase-form" isLoading={isSubmitting} disabled={!canSubmit}>
            Save bill
          </Button>
        </>
      }
    >
      <form id="purchase-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Bill date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            error={errors.purchaseDate}
            disabled={isSubmitting}
          />
          <Input
            label="Supplier's bill no. (optional)"
            placeholder="e.g. INV-4821"
            value={billNo}
            onChange={(e) => setBillNo(e.target.value)}
            error={errors.billNo}
            disabled={isSubmitting}
          />
        </div>

        <p className="rounded-control bg-gray-50 px-3 py-2 text-xs text-gray-500">
          Pick the product, then type the size and color. If that size/color already exists its stock goes up;
          otherwise it is created. A brand-new product must be added in Inventory first (name, category and
          selling price are enough).
        </p>

        {productsLoading && <p className="py-6 text-center text-sm text-gray-400">Loading products…</p>}
        {productsError && (
          <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{productsError}</div>
        )}
        {!productsLoading && !productsError && products.length === 0 && (
          <div className="rounded-control bg-warning-light px-3 py-3 text-sm text-warning">
            There are no active products yet. Add the product in Inventory first, then come back to record this
            bill.
          </div>
        )}

        {canSubmit && (
          <div className="space-y-2">
            <div className={`${gridCols} px-1 text-xs font-medium uppercase tracking-wide text-gray-400`}>
              <span>Product</span>
              <span>Size</span>
              <span>Color</span>
              <span>Pieces</span>
              <span>Price / piece (Rs.)</span>
              <span />
            </div>

            {lines.map((line, index) => {
              const hint = describeLine(line);
              const lineTotal = lineQty(line) * lineCostPaisa(line);
              return (
                <div key={line.key} className="rounded-control border border-gray-200 p-2">
                  <div className={`${gridCols} items-center`}>
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                      disabled={isSubmitting}
                      className={cellInput}
                      aria-label={`Product for line ${index + 1}`}
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.productCode})
                        </option>
                      ))}
                    </select>

                    <input
                      value={line.size}
                      onChange={(e) => updateLine(line.key, { size: e.target.value })}
                      list={`sizes-${line.key}`}
                      placeholder="e.g. M"
                      disabled={isSubmitting}
                      className={cellInput}
                      aria-label={`Size for line ${index + 1}`}
                    />
                    <datalist id={`sizes-${line.key}`}>
                      {sizeSuggestions(line.productId).map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>

                    <input
                      value={line.color}
                      onChange={(e) => updateLine(line.key, { color: e.target.value })}
                      list={`colors-${line.key}`}
                      placeholder="e.g. Navy"
                      disabled={isSubmitting}
                      className={cellInput}
                      aria-label={`Color for line ${index + 1}`}
                    />
                    <datalist id={`colors-${line.key}`}>
                      {colorSuggestions(line.productId).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      disabled={isSubmitting}
                      className={cellInput}
                      aria-label={`Pieces for line ${index + 1}`}
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitCost}
                      onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                      disabled={isSubmitting}
                      className={cellInput}
                      aria-label={`Price per piece for line ${index + 1}`}
                    />

                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length === 1 || isSubmitting}
                      title="Remove line"
                      className="rounded-control p-1.5 text-gray-300 hover:bg-danger-light hover:text-danger disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="mt-1.5 flex items-start justify-between gap-3 px-1 text-xs">
                    <div className="space-y-0.5">
                      {hint && <p className={hint.warn ? "text-warning" : "text-gray-400"}>{hint.text}</p>}
                      {lineErrors[line.key] && <p className="text-danger">{lineErrors[line.key]}</p>}
                    </div>
                    <span className="shrink-0 text-gray-500">
                      Line total:{" "}
                      <span className="font-medium text-gray-900">{lineTotal > 0 ? formatCurrency(lineTotal) : "—"}</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {errors.items && <p className="text-xs text-danger">{errors.items}</p>}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              disabled={isSubmitting}
            >
              <Plus size={14} />
              Add another item
            </Button>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-700">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Winter collection, delivered by truck"
            disabled={isSubmitting}
            className="mt-1.5 w-full rounded-control border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>

        {formError && (
          <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{formError}</div>
        )}
      </form>
    </Modal>
  );
}