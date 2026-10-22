import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@muzammil-pos/ui";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  /** Where clicking the card goes. Leave out for a plain card. */
  to?: string;
}

export function KpiCard({ label, value, hint, icon: Icon, to }: KpiCardProps) {
  const card = (
    <Card className={to ? "h-full transition-shadow group-hover:shadow-md" : "h-full"}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tabular-nums text-gray-900" title={value}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </Card>
  );

  if (!to) return card;

  return (
    <Link
      to={to}
      className="group block rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      {card}
    </Link>
  );
}