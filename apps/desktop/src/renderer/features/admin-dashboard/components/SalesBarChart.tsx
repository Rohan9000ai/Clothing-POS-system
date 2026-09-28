export interface BarDatum {
  label: string;
  /** Value in paisa (or any numeric unit; only relative height matters). */
  value: number;
}

interface SalesBarChartProps {
  data: BarDatum[];
  formatValue?: (value: number) => string;
}

export function SalesBarChart({ data, formatValue = String }: SalesBarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const hasData = max > 0;

  return (
    <div>
      <div className="relative flex h-56 items-end gap-3 border-b border-gray-200 px-2">
        {data.map((d) => {
          const heightPct = hasData ? Math.max((d.value / max) * 100, 2) : 0;
          return (
            <div
              key={d.label}
              className="flex h-full flex-1 flex-col items-center justify-end"
              title={`${d.label}: ${formatValue(d.value)}`}
            >
              <div
                className="w-full max-w-[44px] rounded-t-md bg-brand transition-all"
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}

        {!hasData && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            No sales recorded yet
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-3 px-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-xs text-gray-400">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}