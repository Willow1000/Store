import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  ctaHref?: string;
  ctaLabel?: ReactNode;
  /** Heading level - h2 for page sections (default). */
  as?: "h2" | "h3";
};

/** Title row shared by every storefront section, so headings line up. */
export function SectionHeader({
  title,
  eyebrow,
  description,
  ctaHref,
  ctaLabel = "View all",
  as: Heading = "h2",
}: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <Heading className="text-[1.375rem] font-bold leading-tight text-ink sm:text-2xl">
          {title}
        </Heading>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-gray-600">
            {description}
          </p>
        ) : null}
      </div>
      {ctaHref ? (
        <Link
          href={ctaHref}
          className="group/cta inline-flex flex-none items-center gap-1 whitespace-nowrap pb-0.5 text-sm font-semibold text-ink underline-offset-4 hover:underline"
        >
          {ctaLabel}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      ) : null}
    </div>
  );
}

export default SectionHeader;
