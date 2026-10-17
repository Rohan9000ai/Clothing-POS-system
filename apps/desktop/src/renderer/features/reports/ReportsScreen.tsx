import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Card } from "@muzammil-pos/ui";
import { settingsApi } from "../../services/settings";
import { ExpenseReportTab } from "./ExpenseReportTab";
import { SalesReportTab } from "./SalesReportTab";
import { PeriodBar } from "./components/PeriodBar";
import { initialPeriod, resolvePeriod, type PeriodState } from "./reportPeriod";

type ReportTab = "sales" | "expenses";

const TABS: { value: ReportTab; label: string }[] = [
  { value: "sales", label: "Sales" },
  { value: "expenses", label: "Expenses" },
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-title text-gray-900">Reports</h2>
          <p className="text-sm text-gray-400">Sales and expense reports with charts and PDF export</p>
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

      <PeriodBar state={period} resolved={resolved} onChange={setPeriod} />

      {!resolved.ready ? (
        <Card className="text-center text-sm text-gray-500">{resolved.problem}</Card>
      ) : tab === "sales" ? (
        <SalesReportTab query={resolved.query} shopName={shopName} />
      ) : (
        <ExpenseReportTab query={resolved.query} shopName={shopName} />
      )}
    </div>
  );
}