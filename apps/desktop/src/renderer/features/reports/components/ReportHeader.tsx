import { FileDown, RefreshCw } from "lucide-react";
import { Button } from "@muzammil-pos/ui";

interface ReportHeaderProps {
  title: string;
  subtitle: string;
  onExport: () => void;
  isExporting: boolean;
  /** Shown for "as of now" reports that have no date range. */
  onRefresh?: () => void;
  disabled?: boolean;
}

export function ReportHeader({ title, subtitle, onExport, isExporting, onRefresh, disabled }: ReportHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="text-section text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button variant="secondary" onClick={onRefresh} disabled={disabled}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        )}
        <Button variant="secondary" onClick={onExport} isLoading={isExporting} disabled={disabled}>
          <FileDown size={16} />
          Export PDF
        </Button>
      </div>
    </div>
  );
}