/**
 * Breadcrumb Navigation Component - SEO-optimized with structured data
 * Improves UX and provides context for search engines and LLMs
 */

import { Link } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  // Include home in the breadcrumb
  const allItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    ...items,
  ];

  // Create structured data for breadcrumbs
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: new URL(item.href, typeof window !== 'undefined' ? window.location.origin : 'https://motorvault.com').href,
    })),
  };

  // Inject structured data
  if (typeof document !== 'undefined') {
    let scriptTag = document.querySelector('script[data-breadcrumb="true"]') as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      scriptTag.setAttribute('data-breadcrumb', 'true');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center flex-wrap gap-2 text-sm ${className}`}
    >
      {allItems.map((item, index) => (
        <div key={item.href} className="flex items-center gap-2">
          {index > 0 && <ChevronRight size={16} className="text-gray-400" />}
          
          {index === allItems.length - 1 ? (
            // Current page (not a link)
            <span
              className="text-gray-900 font-medium"
              aria-current="page"
            >
              {item.label}
            </span>
          ) : (
            // Link to previous pages
            <Link
              href={item.href}
              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              {index === 0 ? (
                <>
                  <Home size={16} className="inline mr-1" />
                  {item.label}
                </>
              ) : (
                item.label
              )}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

export default Breadcrumb;
