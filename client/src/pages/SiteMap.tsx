import { SEOHead } from "@/components/SEOHead";
import { Link } from "wouter";
import { useCategories } from "@/hooks/useSupabaseProducts";
import { BLOG_POSTS } from "@shared/blogPosts";

const corePages = [
  { href: "/", label: "Home" },
  { href: "/products", label: "All Products" },
  { href: "/vin-decoder", label: "VIN Decoder" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/help", label: "Help Center" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const policyPages = [
  { href: "/shipping", label: "Shipping Policy" },
  { href: "/returns", label: "Returns Policy" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/accessibility", label: "Accessibility Statement" },
];

export default function SiteMap() {
  const { categories } = useCategories();

  const categoryLinks = categories
    .map(category => {
      const categoryValue = String(category.slug || category.name || "").trim();
      if (!categoryValue) return null;
      return {
        href: `/products?category=${encodeURIComponent(categoryValue)}`,
        label: category.name || categoryValue,
      };
    })
    .filter((item): item is { href: string; label: string } => Boolean(item));

  return (
    <>
      <SEOHead
        pageType="generic"
        title="HTML Sitemap | MotorVault"
        description="Browse every major MotorVault page from one crawl-friendly sitemap hub."
        canonical="https://motorvault.shop/site-map"
        keywords={[
          "html sitemap",
          "site navigation",
          "motorvault pages",
          "crawlable links",
        ]}
      />

      <div className="min-h-screen bg-background py-10">
        <div className="mx-auto max-w-screen-lg px-4 sm:px-6">
          <h1 className="text-3xl font-extrabold text-gray-900">
            HTML Sitemap
          </h1>
          <p className="mt-3 text-gray-600">
            This page lists major sections so both visitors and search crawlers
            can navigate the site with minimal hops.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-bold text-gray-900">Core Pages</h2>
              <ul className="mt-4 space-y-2">
                {corePages.map(page => (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      className="text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-bold text-gray-900">
                Policies And Support
              </h2>
              <ul className="mt-4 space-y-2">
                {policyPages.map(page => (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      className="text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-bold text-gray-900">
              Shop By Category
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Category links below point directly to filtered catalog pages.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {categoryLinks.length > 0 ? (
                categoryLinks.map(category => (
                  <li key={category.href}>
                    <Link
                      href={category.href}
                      className="text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      {category.label}
                    </Link>
                  </li>
                ))
              ) : (
                <li>
                  <Link
                    href="/products"
                    className="text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    Browse all products
                  </Link>
                </li>
              )}
            </ul>
          </section>

          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-bold text-gray-900">
              Machine Sitemap Files
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a
                  href="/robots.txt"
                  className="text-blue-700 hover:text-blue-800 hover:underline"
                >
                  robots.txt
                </a>
              </li>
              <li>
                <a
                  href="/sitemap.xml"
                  className="text-blue-700 hover:text-blue-800 hover:underline"
                >
                  sitemap.xml
                </a>
              </li>
              <li>
                <a
                  href="/sitemap-products.xml"
                  className="text-blue-700 hover:text-blue-800 hover:underline"
                >
                  sitemap-products.xml
                </a>
              </li>
            </ul>
          </section>

          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-bold text-gray-900">Blog Articles</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {BLOG_POSTS.map(post => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
