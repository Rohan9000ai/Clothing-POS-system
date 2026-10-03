import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Printer, Receipt as ReceiptIcon } from "lucide-react";
import { Button } from "@muzammil-pos/ui";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { salesApi, type SaleDetail } from "../../services/sales";
import { settingsApi } from "../../services/settings";
import { buildInvoiceHtml, buildThermalReceiptHtml } from "../../utils/receiptTemplates";
import type { Settings } from "@muzammil-pos/types";

export function InvoiceScreen() {
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const push = useToastStore((s) => s.push);

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState<"invoice" | "receipt" | null>(null);

    useEffect(() => {
    if (!saleId) return;
    const currentSaleId: string = saleId;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [saleResult, settingsResult] = await Promise.all([
          salesApi.get(currentSaleId),
          settingsApi.get(),
        ]);
        if (cancelled) return;
        setSale(saleResult);
        setSettings(settingsResult);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Could not load this invoice.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [saleId]);

  async function handlePrint(kind: "invoice" | "receipt") {
    if (!sale || !settings) return;
    setIsPrinting(kind);
    try {
      const html = kind === "invoice" ? buildInvoiceHtml(sale, settings) : buildThermalReceiptHtml(sale, settings);
      const result = await window.muzammilPOS.print(html);
      if (result.success) {
        push("success", kind === "invoice" ? "Invoice sent to printer." : "Receipt sent to printer.");
      } else {
        push("error", result.error ?? "Printing failed. Please try again.");
      }
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Printing failed. Please try again.");
    } finally {
      setIsPrinting(null);
    }
  }

  const invoiceHtml = sale && settings ? buildInvoiceHtml(sale, settings) : null;

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-100">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-base font-semibold text-gray-900">
            {sale ? `Invoice ${sale.billNo}` : "Invoice"}
          </h1>
          <p className="text-xs text-gray-400">Saved successfully — review and print below</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePrint("receipt")}
            isLoading={isPrinting === "receipt"}
            disabled={!sale || isPrinting !== null}
          >
            <ReceiptIcon size={15} />
            Print thermal receipt
          </Button>
          <Button
            size="sm"
            onClick={() => handlePrint("invoice")}
            isLoading={isPrinting === "invoice"}
            disabled={!sale || isPrinting !== null}
          >
            <Printer size={15} />
            Print invoice
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("/pos")}>
            New sale
          </Button>
          {user?.role === "ADMIN" && (
            <Button variant="secondary" size="sm" onClick={() => navigate("/")}>
              Back to admin
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {isLoading && <p className="text-center text-sm text-gray-400">Loading invoice…</p>}

        {loadError && (
          <div className="mx-auto max-w-md rounded-control bg-danger-light px-4 py-3 text-center text-sm text-danger">
            {loadError}
          </div>
        )}

        {invoiceHtml && (
          <div className="mx-auto max-w-3xl overflow-hidden rounded-card bg-white shadow">
            <iframe title="Invoice preview" srcDoc={invoiceHtml} className="h-[80vh] w-full border-0" />
          </div>
        )}
      </main>
    </div>
  );
}