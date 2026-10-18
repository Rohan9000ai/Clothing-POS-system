import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Card } from "@muzammil-pos/ui";
import { settingsApi } from "../../services/settings";
import { ExpenseReportTab } from "./ExpenseReportTab";
import { FinancialReportTab } from "./FinancialReportTab";
import { PayablesReportTab } from "./PayablesReportTab";
import { ReceivablesReportTab } from "./ReceivablesReportTab";
import { SalesReportTab } from "./SalesReportTab";
import { StockReportTab } from "./StockReportTab";
import { PeriodBar } from "./components/PeriodBar";
import { initialPeriod, resolvePeriod, type PeriodState } from "./reportPeriod";

type ReportTab = "sales" | "expenses" | "profit" | "stock" | "receivables" | "payables";

/** `usesPeriod: false` reports show the position right now, so they have no date range. */
const TABS: { value: ReportTab; label: string; usesPeriod: boolean }[] = [
  { value: "sales", label: "Sales", usesPeriod: true },
  { value: "expenses", label: "Expenses", usesPeriod: true },
  { value: "profit", label: "Profit & loss", usesPeriod: true },
  { value: "stock", label: "Stock", usesPeriod: false },
  { value: "receivables", label: "Receivables", usesPeriod: false },
  { value: "payables", label: "Payables", usesPeriod: false },
];

export function ReportsScreen() {
  const [tab, setTab] = useState<ReportTab>("sales");
  const [period, setPeriod] = useState<PeriodState>(initialPeriod);
  const [shopName, setShopName] = useState("Muzammil Store");

  useEffect(() => {
    settingsApi
      .get()
      .then((settings) => setShopName(settings.shopName))
      .catch(() => {
        // The PDF header just keeps the default shop name.
      });
  }, []);

  const resolved = useMemo(() => resolvePeriod(period), [period]);
  const activeTab = TABS.find((item) => item.value === tab) ?? TABS[0];
  const usesPeriod = activeTab?.usesPeriod ?? true;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-title text-gray-900">Reports</h2>
          <p className="text-sm text-gray-400">Sales, expenses, profit, stock and balances, with PDF export</p>
        </div>
        <div className="inline-flex rounded-control border border-gray-200 bg-gray-50 p-0.5">
          {TABS.map((item) => (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={clsx(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                tab === item.value ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {usesPeriod && <PeriodBar state={period} resolved={resolved} onChange={setPeriod} />}

      {usesPeriod && !resolved.ready ? (
        <Card className="text-center text-sm text-gray-500">{resolved.problem}</Card>
      ) : tab === "sales" ? (
        <SalesReportTab query={resolved.query} shopName={shopName} />
      ) : tab === "expenses" ? (
        <ExpenseReportTab query={resolved.query} shopName={shopName} />
      ) : tab === "profit" ? (
        <FinancialReportTab query={resolved.query} shopName={shopName} />
      ) : tab === "stock" ? (
        <StockReportTab shopName={shopName} />
      ) : tab === "receivables" ? (
        <ReceivablesReportTab shopName={shopName} />
      ) : (
        <PayablesReportTab shopName={shopName} />
      )}
    </div>
  );
}