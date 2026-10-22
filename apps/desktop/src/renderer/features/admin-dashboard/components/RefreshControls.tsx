import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button, ToggleSwitch } from "@muzammil-pos/ui";
import { agoLabel, timeLabel } from "../dashboardTime";
import type { RefreshSource } from "../useDashboardData";

interface RefreshControlsProps {
  /** When the numbers on screen were produced, or null before the first load. */
  generatedAt: string | null;
  autoRefresh: boolean;
  onToggleAuto: (next: boolean) => void;
  refreshingSource: RefreshSource | null;
  onRefresh: () => void;
}

export function RefreshControls({
  generatedAt,
  autoRefresh,
  onToggleAuto,
  refreshingSource,
  onRefresh,
}: RefreshControlsProps) {
  // Re-render every 15 seconds so "Updated 2 min ago" keeps counting.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  let status: string;
  if (!generatedAt) status = refreshingSource ? "Loading…" : "Not loaded yet";
  else if (refreshingSource) status = "Updating…";
  else if (autoRefresh) status = `Updated ${agoLabel(now - Date.parse(generatedAt))}`;
  else status = `Auto-refresh paused · numbers from ${timeLabel(generatedAt)}`;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
          <ToggleSwitch checked={autoRefresh} onChange={() => onToggleAuto(!autoRefresh)} label="Auto-refresh" />
          Auto-refresh
        </label>
        <Button variant="secondary" onClick={onRefresh} isLoading={refreshingSource === "manual"}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>
      <p className="text-xs text-gray-400" role="status">
        {status}
      </p>
    </div>
  );
}