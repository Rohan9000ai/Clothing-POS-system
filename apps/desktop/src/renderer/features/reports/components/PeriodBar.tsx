import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { Button } from "@muzammil-pos/ui";
import { toLocalYmd, type RangePreset } from "../../expenses/expenseRange";
import { periodTitle, shiftAnchor, type PeriodState, type ResolvedPeriod } from "../reportPeriod";

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "custom", label: "Custom range" },
];

interface PeriodBarProps {
  state: PeriodState;
  resolved: ResolvedPeriod;
  onChange: (next: PeriodState) => void;
}

const dateInput = "rounded-control border border-gray-300 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

export function PeriodBar({ state, resolved, onChange }: PeriodBarProps) {
  const today = toLocalYmd(new Date());
  const { from, to } = resolved.range;
  const isCustom = state.preset === "custom";
  const includesToday = !!from && !!to && from <= today && today <= to;
  const canGoNext = !!to && to < today;

  function selectPreset(preset: RangePreset) {
    if (preset === "custom") {
      // Start from the dates currently on screen instead of an empty form.
      onChange({ ...state, preset, customFrom: state.customFrom || from || "", customTo: state.customTo || to || "" });
      return;
    }
    onChange({ ...state, preset });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-gray-200 bg-white p-3">
      <div className="inline-flex rounded-control border border-gray-200 bg-gray-50 p-0.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => selectPreset(preset.value)}
            className={clsx(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              state.preset === preset.value ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {isCustom ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>From</span>
          <input
            type="date"
            value={state.customFrom}
            onChange={(e) => onChange({ ...state, customFrom: e.target.value })}
            className={dateInput}
          />
          <span>To</span>
          <input
            type="date"
            value={state.customTo}
            onChange={(e) => onChange({ ...state, customTo: e.target.value })}
            className={dateInput}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(shiftAnchor(state, -1))}
            className="rounded-control border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50"
            title={`Previous ${state.preset}`}
            aria-label={`Previous ${state.preset}`}
          >
            <ChevronLeft size={16} />
          </button>
          <p className="min-w-[210px] text-center text-sm font-medium text-gray-900">
            {periodTitle(state.preset, resolved.range)}
          </p>
          <button
            onClick={() => onChange(shiftAnchor(state, 1))}
            disabled={!canGoNext}
            className="rounded-control border border-gray-300 p-1.5 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            title={`Next ${state.preset}`}
            aria-label={`Next ${state.preset}`}
          >
            <ChevronRight size={16} />
          </button>
          <input
            type="date"
            value={state.anchor}
            onChange={(e) => e.target.value && onChange({ ...state, anchor: e.target.value })}
            className={dateInput}
            title="Jump to a date"
          />
          {!includesToday && (
            <Button variant="secondary" size="sm" onClick={() => onChange({ ...state, anchor: today })}>
              Today
            </Button>
          )}
        </div>
      )}
    </div>
  );
}