import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { Card } from "@muzammil-pos/ui";
import { describeChange } from "../reportFormat";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  /** Percent change against the previous period. Leave undefined to hide the comparison. */
  change?: number | null;
  /** True for sales (an increase is good), false for expenses (an increase is bad). */
  increaseIsGood?: boolean;
  compareLabel?: string;
}

export function StatCard({ label, value, hint, change, increaseIsGood = true, compareLabel = "" }: StatCardProps) {
  const description = change === undefined ? null : describeChange(change, increaseIsGood, compareLabel);
  const Icon =
    description?.direction === "up" ? TrendingUp : description?.direction === "down" ? TrendingDown : Minus;

  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {description && (
        <p
          className={clsx(
            "mt-2 flex items-center gap-1 text-xs",
            description.tone === "good" && "text-success",
            description.tone === "bad" && "text-danger",
            description.tone === "neutral" && "text-gray-400"
          )}
        >
          {description.direction !== "none" && <Icon size={13} />}
          <span>{description.text}</span>
        </p>
      )}
    </Card>
  );
}