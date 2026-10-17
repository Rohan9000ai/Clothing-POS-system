import { Badge } from "@muzammil-pos/ui";

export interface ShareBarRow {
  key: string;
  label: string;
  value: string;
  detail?: string;
  percent: number;
  tag?: string;
}

export function ShareBars({ rows, color }: { rows: ShareBarRow[]; color: string }) {
  return (
    <div className="space-y-3.5">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-700">
              {row.label}
              {row.tag && <Badge tone="warning">{row.tag}</Badge>}
            </span>
            <span className="font-medium text-gray-900">{row.value}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(Math.max(row.percent, 0), 100)}%`, backgroundColor: color }}
            />
          </div>
          {row.detail && <p className="mt-0.5 text-xs text-gray-400">{row.detail}</p>}
        </div>
      ))}
    </div>
  );
}