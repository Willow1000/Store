import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /** Rendered as the page's single <h1>. */
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Trail after "Home". Omit for no breadcrumb. */
  breadcrumb?: Array<{ label: string; href: string }>;
  /** Extra content under the description (actions, meta). */
  children?: ReactNode;
  /** Narrow column for long-form pages so the title lines up with the text. */
  narrow?: boolean;
  className?: string;
};

/**
 * The header band every non-home page opens with: breadcrumb, title and a
 * one-line description on the tinted strip, aligned to the shared container.
 * The breadcrumb here is visual only; pages that publish BreadcrumbList
 * structured data keep doing so through SEOHead.
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  breadcrumb,
  children,
  narrow = false,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("border-b border-gray-200 bg-gray-50", className)}>
      <div className="container py-6 sm:py-8">
        <div className={narrow ? "mx-auto max-w-3xl" : undefined}>
          {breadcrumb && breadcrumb.length > 0 ? (
            <Breadcrumb
              items={breadcrumb}
              className="mb-3"
              includeStructuredData={false}
            />
          ) : null}
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
          <h1 className="text-ink">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export default PageHeader;
