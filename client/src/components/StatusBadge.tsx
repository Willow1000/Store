import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "error" | "neutral" | "info";

const toneClasses: Record<StatusTone, { badge: string; dot: string }> = {
  success: {
    badge: "border-success/25 bg-success/10 text-success",
    dot: "bg-success",
  },
  warning: {
    badge: "border-warning/25 bg-warning/10 text-warning",
    dot: "bg-warning",
  },
  error: { badge: "border-brand/25 bg-brand-soft text-brand", dot: "bg-brand" },
  // "info" is in-progress work: ink rather than a fifth hue.
  info: { badge: "border-gray-300 bg-white text-ink", dot: "bg-ink" },
  neutral: {
    badge: "border-gray-200 bg-gray-100 text-gray-700",
    dot: "bg-gray-400",
  },
};

type StatusBadgeProps = {
  tone?: StatusTone;
  children: ReactNode;
  /** Optional leading icon; a dot is shown when omitted. */
  icon?: ReactNode;
  className?: string;
};

/**
 * One status pill for orders, payments, tickets and notifications, drawn from
 * the semantic tokens (success / warning / brand red / neutral) instead of
 * per-page blue, purple and yellow utility colours.
 */
export function StatusBadge({
  tone = "neutral",
  children,
  icon,
  className,
}: StatusBadgeProps) {
  const classes = toneClasses[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold capitalize leading-none",
        classes.badge,
        className
      )}
    >
      {icon ?? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", classes.dot)}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

/**
 * Maps the status words the backend uses (orders, payments, tickets) onto a
 * tone. Unknown values fall back to neutral rather than guessing.
 */
export function statusTone(status: string | null | undefined): StatusTone {
  const value = String(status || "")
    .toLowerCase()
    .trim();
  if (
    [
      "completed",
      "complete",
      "delivered",
      "paid",
      "success",
      "successful",
      "resolved",
      "closed",
    ].includes(value)
  ) {
    return "success";
  }
  if (
    ["pending", "awaiting", "on hold", "on_hold", "waiting", "unpaid"].includes(
      value
    )
  ) {
    return "warning";
  }
  if (
    ["failed", "cancelled", "canceled", "refunded", "rejected"].includes(value)
  ) {
    return "error";
  }
  if (
    [
      "processing",
      "packaged",
      "shipped",
      "in progress",
      "in_progress",
      "open",
      "confirmed",
    ].includes(value)
  ) {
    return "info";
  }
  return "neutral";
}

export default StatusBadge;
