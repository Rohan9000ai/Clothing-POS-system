import { useMemo, useState, type FormEvent } from "react";
import { Printer, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { Button, Card, Input } from "@muzammil-pos/ui";
import type { Settings } from "@muzammil-pos/types";
import { updateSettingsSchema } from "@muzammil-pos/validation";
import { formatCurrency, taxIncludedAmount } from "@muzammil-pos/utils";
import { settingsApi } from "../../services/settings";
import { useSettingsStore, useShopSettings } from "../../store/settingsStore";
import { useToastStore } from "../../store/toastStore";
import { getFieldErrors, zodFieldErrors } from "../../utils/formErrors";
import { buildInvoiceHtml, buildThermalReceiptHtml } from "../../utils/receiptTemplates";
import { buildSampleSale } from "./sampleSale";

interface Draft {
  shopName: string;
  header: string;
  footer: string;
  tax: string;
  threshold: string;
}

function toDraft(settings: Settings): Draft {
  return {
    shopName: settings.shopName,
    header: settings.receiptHeader ?? "",
    footer: settings.receiptFooter ?? "",
    tax: String(settings.taxPercent),
    threshold: String(settings.lowStockThreshold),
  };
}

function toNumber(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

const textareaClass =
  "w-full rounded-control border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

/** Waits for the settings to load, then shows the form. */
export function ReceiptSettingsPanel() {
  const { settings, status, reload } = useShopSettings();

  if (!settings) {
    return (
      <Card className="text-center text-sm">
        {status === "error" ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-danger">Could not load the shop settings.</p>
            <Button variant="secondary" size="sm" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : (
          <p className="text-gray-400">Loading the shop settings…</p>
        )}
      </Card>
    );
  }

  return <ReceiptSettingsForm settings={settings} />;
}

function ReceiptSettingsForm({ settings }: { settings: Settings }) {
  const push = useToastStore((s) => s.push);
  const setStoreSettings = useSettingsStore((s) => s.setSettings);

  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [view, setView] = useState<"receipt" | "invoice">("receipt");

  const baseline = useMemo(() => toDraft(settings), [settings]);
  const isDirty = (Object.keys(draft) as (keyof Draft)[]).some((key) => draft[key].trim() !== baseline[key].trim());

  function update(patch: Partial<Draft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  // What the preview shows: the draft, with sensible stand-ins for anything not valid yet.
  const previewSettings = useMemo<Settings>(() => {
    const tax = toNumber(draft.tax);
    return {
      ...settings,
      shopName: draft.shopName.trim() || "Your shop name",
      receiptHeader: draft.header.trim() || null,
      receiptFooter: draft.footer.trim() || null,
      taxPercent: Number.isFinite(tax) && tax >= 0 && tax <= 100 ? tax : 0,
    };
  }, [draft, settings]);

  const sampleSale = useMemo(() => buildSampleSale(previewSettings.taxPercent), [previewSettings.taxPercent]);

  const previewHtml = useMemo(
    () =>
      view === "receipt"
        ? buildThermalReceiptHtml(sampleSale, previewSettings)
        : buildInvoiceHtml(sampleSale, previewSettings),
    [view, sampleSale, previewSettings]
  );

  const taxValue = toNumber(draft.tax);
  const taxExample =
    Number.isFinite(taxValue) && taxValue > 0 && taxValue <= 100
      ? `On a ${formatCurrency(100000)} bill, ${formatCurrency(taxIncludedAmount(100000, taxValue))} of it is tax.`
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const parsed = updateSettingsSchema.safeParse({
      shopName: draft.shopName,
      receiptHeader: draft.header,
      receiptFooter: draft.footer,
      taxPercent: toNumber(draft.tax),
      lowStockThreshold: toNumber(draft.threshold),
    });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});

    setIsSaving(true);
    try {
      const saved = await settingsApi.update(parsed.data);
      setStoreSettings(saved);
      setDraft(toDraft(saved));
      push("success", "Settings saved. New and reprinted invoices use them now.");
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else setFormError(err instanceof Error ? err.message : "Could not save the settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setDraft(toDraft(settings));
    setErrors({});
    setFormError(null);
  }

  async function handlePrintTest() {
    setIsPrinting(true);
    try {
      const result = await window.muzammilPOS.print(buildThermalReceiptHtml(sampleSale, previewSettings));
      if (result.success) push("success", "Test receipt sent to the printer.");
      else push("error", result.error ?? "Printing failed. Please try again.");
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Printing failed. Please try again.");
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="grid grid-cols-5 gap-6">
      <Card className="col-span-2">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <h3 className="text-section text-gray-900">Receipt & shop</h3>
            <p className="text-xs text-gray-400">Used on every invoice, receipt and report PDF.</p>
          </div>

          <Input
            label="Shop name"
            value={draft.shopName}
            onChange={(e) => update({ shopName: e.target.value })}
            error={errors.shopName}
            disabled={isSaving}
          />
          <Input
            label="Header text"
            placeholder="e.g. Quality clothing since 1990"
            value={draft.header}
            onChange={(e) => update({ header: e.target.value })}
            error={errors.receiptHeader}
            hint="One line under the shop name."
            disabled={isSaving}
          />
          <div>
            <label htmlFor="receipt-footer" className="text-xs font-medium text-gray-700">
              Footer text
            </label>
            <textarea
              id="receipt-footer"
              rows={3}
              value={draft.footer}
              onChange={(e) => update({ footer: e.target.value })}
              placeholder={"e.g. Exchange within 7 days with receipt\nNo exchange on sale items"}
              disabled={isSaving}
              className={clsx(textareaClass, "mt-1.5", errors.receiptFooter ? "border-danger" : "border-gray-300")}
            />
            {errors.receiptFooter ? (
              <p className="mt-1 text-xs text-danger">{errors.receiptFooter}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-400">Up to 4 lines. Urdu is fine.</p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <Input
              label="Tax percent (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={draft.tax}
              onChange={(e) => update({ tax: e.target.value })}
              error={errors.taxPercent}
              disabled={isSaving}
            />
            <p className="mt-1 text-xs text-gray-400">
              Prices already include this tax. It is not added on top: the receipt only shows how much of the total is
              tax. Use 0 if you don't charge tax. Each bill keeps the rate it was made with.
              {taxExample && <span className="mt-1 block text-gray-500">{taxExample}</span>}
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <Input
              label="Low stock limit (pieces)"
              type="number"
              min="1"
              step="1"
              value={draft.threshold}
              onChange={(e) => update({ threshold: e.target.value })}
              error={errors.lowStockThreshold}
              disabled={isSaving}
            />
            <p className="mt-1 text-xs text-gray-400">
              A size/color counts as low when fewer than this many pieces are left. Used in Inventory, the cashier screen
              and reports.
            </p>
          </div>

          {formError && (
            <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{formError}</div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" isLoading={isSaving} disabled={!isDirty}>
              Save settings
            </Button>
            <Button type="button" variant="secondary" onClick={handleReset} disabled={!isDirty || isSaving}>
              <RotateCcw size={14} />
              Reset
            </Button>
            {isDirty && <span className="text-xs text-warning">Unsaved changes</span>}
          </div>
        </form>
      </Card>

      <Card className="col-span-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-section text-gray-900">Preview</h3>
            <p className="text-xs text-gray-400">Made-up sample bill. It updates as you type.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-control border border-gray-200 bg-gray-50 p-0.5">
              {(
                [
                  ["receipt", "Thermal receipt"],
                  ["invoice", "Invoice"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setView(value)}
                  className={clsx(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    view === value ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={handlePrintTest} isLoading={isPrinting}>
              <Printer size={14} />
              Print test receipt
            </Button>
          </div>
        </div>

        <div className="flex justify-center rounded-control bg-gray-100 p-4">
          <iframe
            title="Receipt preview"
            srcDoc={previewHtml}
            sandbox=""
            className={clsx("border-0 bg-white shadow", view === "receipt" ? "h-[540px] w-[330px]" : "h-[640px] w-full")}
          />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          The test print uses your real printer settings and the sample bill above. Real bills show their own items.
        </p>
      </Card>
    </div>
  );
}