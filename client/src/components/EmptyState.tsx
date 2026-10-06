import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons / links. */
  children?: ReactNode;
  /** "alert" swaps the neutral icon chip for the brand-tinted one. */
  tone?: "neutral" | "alert";
  className?: string;
};

/** The one empty / nothing-here / something-went-wrong block. */
export function EmptyState({
  icon,
  title,
  description,
  children,
  tone = "neutral",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-lg flex-col items-center rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center",
        className
      )}
    >
      {icon ? (
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full [&_svg]:h-5 [&_svg]:w-5",
            tone === "alert"
              ? "bg-brand-soft text-brand"
              : "bg-gray-100 text-gray-500"
          )}
        >
          {icon}
        </div>
      ) : null}
      <p className="mt-4 text-base font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-gray-600">{description}</p>
      ) : null}
      {children ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export default EmptyState;
