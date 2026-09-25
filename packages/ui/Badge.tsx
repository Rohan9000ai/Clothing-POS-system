import type { HTMLAttributes } from "react";
import clsx from "clsx";

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "brand";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  danger: "bg-danger-light text-danger",
  neutral: "bg-gray-100 text-gray-600",
  brand: "bg-brand-light text-brand",
};

/** Maps common status/enum string values to a sensible badge tone. */
export function toneForStatus(status: string): BadgeTone {
  const positive = ["ACTIVE", "PAID", "COMPLETED", "OK"];
  const warn = ["PARTIAL", "LOW_STOCK", "PENDING"];
  const negative = ["INACTIVE", "UNPAID", "OUT_OF_STOCK", "VOID", "ERROR"];

  if (positive.includes(status)) return "success";
  if (warn.includes(status)) return "warning";
  if (negative.includes(status)) return "danger";
  return "neutral";
}

export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_CLASSES[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}