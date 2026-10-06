/**
 * Breadcrumb Navigation Component - SEO-optimized with structured data
 * Improves UX and provides context for search engines and LLMs
 */

import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { useEffect } from "react";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  includeStructuredData?: boolean;
}

export function Breadcrumb({
  items,
  className = "",
  includeStructuredData = true,
}: BreadcrumbProps) {
  // Include home in the breadcrumb
  const allItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, ...items];

  // Create structured data for breadcrumbs
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: allItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: new URL(
        item.href,
        typeof window !== "undefined"
          ? window.location.origin
          : "https://motorvault.shop"
      ).href,
    })),
  };

  useEffect(() => {
    if (!includeStructuredData || typeof document === "undefined") return;

    let scriptTag = document.querySelector(
      'script[data-breadcrumb="true"]'
    ) as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.type = "application/ld+json";
      scriptTag.setAttribute("data-breadcrumb", "true");
      document.head.appendChild(scriptTag);
    }
    // Same Trusted Types constraint as SEOHead: assigning a string to a
    // <script> element's textContent is a guarded sink under the CSP's
    // `require-trusted-types-for 'script'`. Insert a text node instead.
    while (scriptTag.firstChild) {
      scriptTag.removeChild(scriptTag.firstChild);
    }
    scriptTag.appendChild(
      document.createTextNode(JSON.stringify(structuredData))
    );
  }, [includeStructuredData, structuredData]);

  // Phones get one "back to parent" link with a full-size touch target
  // instead of a wrapping multi-line trail; larger screens get the trail.
  const parent = allItems.length > 1 ? allItems[allItems.length - 2] : null;

  return (
    <nav aria-label="Breadcrumb" className={`min-w-0 text-[13px] ${className}`}>
      {parent ? (
        <Link
          href={parent.href}
          className="-my-2.5 inline-flex min-h-11 max-w-full items-center gap-1 font-medium text-gray-600 hover:text-ink sm:hidden"
        >
          <ChevronLeft size={16} className="flex-none" aria-hidden="true" />
          <span className="truncate">{parent.label}</span>
        </Link>
      ) : null}
      <div className="hidden min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 sm:flex">
        {allItems.map((item, index) => (
          <div key={item.href} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && (
              <ChevronRight
                size={14}
                className="flex-none text-gray-400"
                aria-hidden="true"
              />
            )}

            {index === allItems.length - 1 ? (
              // Current page (not a link)
              <span
                className="max-w-[60vw] truncate font-medium text-ink sm:max-w-md"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              // Link to previous pages
              <Link
                href={item.href}
                className="whitespace-nowrap text-gray-500 transition-colors hover:text-ink hover:underline hover:underline-offset-2"
              >
                {index === 0 ? (
                  <>
                    <Home
                      size={14}
                      className="mr-1 inline -translate-y-px"
                      aria-hidden="true"
                    />
                    {item.label}
                  </>
                ) : (
                  item.label
                )}
              </Link>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

export default Breadcrumb;
