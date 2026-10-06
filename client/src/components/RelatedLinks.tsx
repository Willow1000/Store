import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type RelatedLinksProps = {
  links: Array<{ href: string; label: string }>;
  className?: string;
};

/**
 * A short row of "where next" links between closely related pages (help,
 * policies, guides). Plain crawlable links with the destination's own name
 * as anchor text; keep it to a handful per page.
 */
export function RelatedLinks({ links, className }: RelatedLinksProps) {
  if (links.length === 0) return null;
  return (
    <nav
      aria-label="Related pages"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {links.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-ink no-underline transition-colors hover:border-ink"
        >
          {link.label}
          <ArrowRight
            className="h-3.5 w-3.5 text-gray-500"
            aria-hidden="true"
          />
        </Link>
      ))}
    </nav>
  );
}

export default RelatedLinks;
