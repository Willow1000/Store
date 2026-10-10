import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { PageHeader } from "@/components/PageHeader";
import { RelatedLinks } from "@/components/RelatedLinks";
import {
  PRODUCT_GRID_CLASS,
  ProductCard,
  ProductCardSkeletonItem,
} from "@/components/ProductCard";
import { useAuth } from "@/_core/hooks/useAuth";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { useCategories } from "@/hooks/useSupabaseProducts";
import { categoryHrefFor } from "@/lib/categoryLinks";
import { supabase } from "@/lib/supabase";
import { getHighResImageUrl } from "@/lib/images";
import { isHydrating, useSsrPageData } from "@/lib/ssrPageData";
import { useMarkNotFound } from "@/lib/ssrStatus";
import type { Product } from "@/types/supabase";
import { getGuidesForVehicle } from "@shared/guideLinks";
import {
  VEHICLES,
  getVehicleContent,
  vehicleTitleFilter,
} from "@shared/vehicleContent";
import NotFound from "./NotFound";

/** The SSR listing key for a vehicle page (see entry-server.tsx). */
export const vehicleListingKey = (slug: string) => `vehicle:${slug}`;

/**
 * /vehicle/:slug - every product whose title names the vehicle, e.g.
 * "Ford F-150 Accessories & Parts". Server-rendered with its products so the
 * page and its product links are in the HTML.
 */
export default function VehicleParts() {
  const [, params] = useRoute("/vehicle/:slug");
  const vehicle = getVehicleContent(params?.slug);
  const ssrListing = useSsrPageData()?.listing;
  const ssrProducts =
    vehicle &&
    ssrListing?.categorySlug === vehicleListingKey(vehicle.slug) &&
    // On the server, and in the browser while still on the URL the server
    // rendered; after client-side navigation the page fetches its own.
    (typeof window === "undefined" || isHydrating())
      ? ssrListing.products
      : null;
  const [products, setProducts] = useState<Product[] | null>(ssrProducts);
  const { user } = useAuth();
  const { addProduct, pendingId } = useQuickAdd(user?.id || null);
  const { categories } = useCategories();

  // The categories this vehicle's products sit in, most products first.
  const vehicleCategories = useMemo(() => {
    const counts = new Map<string, number>();
    (products ?? []).forEach(product => {
      const name = String(product.category_name || "").trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [products]);

  useEffect(() => {
    if (!vehicle) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select(
          "id, title, category_name, price, discount, condition, cover_image_url, brand, model, stock, part_number, created_at"
        )
        .or(vehicleTitleFilter(vehicle))
        .order("created_at", { ascending: false })
        .limit(120);
      if (cancelled || !data) return;
      setProducts(
        (data as Product[]).map(product => ({
          ...product,
          cover_image_url: getHighResImageUrl(product.cover_image_url || ""),
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicle?.slug]);

  if (!vehicle) return <NotFoundForVehicle />;

  const heading = vehicle.heading ?? `${vehicle.name} Accessories & Parts`;
  const otherVehicles = VEHICLES.filter(v => v.slug !== vehicle.slug);
  const guides = getGuidesForVehicle(vehicle.slug);

  return (
    <>
      <SEOHead
        pageType="category"
        title={vehicle.seoTitle}
        description={vehicle.metaDescription}
        canonical={`/vehicle/${vehicle.slug}`}
        keywords={[
          `${vehicle.name} parts`,
          ...(vehicle.heading
            ? [`used ${vehicle.name} parts`]
            : [
                `${vehicle.name} accessories`,
                `best ${vehicle.name} accessories`,
              ]),
        ]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Products", url: "/products" },
          { name: heading, url: `/vehicle/${vehicle.slug}` },
        ]}
        itemList={(products ?? []).map(product => ({
          name: product.title,
          url: `/product/${product.id}`,
        }))}
      />
      <div className="min-h-screen bg-white">
        <PageHeader
          title={heading}
          description={vehicle.intro}
          breadcrumb={[
            { label: "Products", href: "/products" },
            { label: heading, href: `/vehicle/${vehicle.slug}` },
          ]}
        />

        <div className="container py-6 sm:py-8">
          {products === null ? (
            <div className={PRODUCT_GRID_CLASS}>
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeletonItem key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-gray-600">
              No {vehicle.name} products are listed right now.{" "}
              <Link href="/products" className="underline">
                Browse all products
              </Link>
              .
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-600">
                {products.length}{" "}
                {products.length === 1 ? "product" : "products"} for the{" "}
                {vehicle.name}
              </p>
              <h2 className="sr-only">{vehicle.name} products in stock</h2>
              <div className={PRODUCT_GRID_CLASS}>
                {products.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={idx < 2}
                    onAddToCart={addProduct}
                    isAdding={pendingId === product.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {vehicle.faqs.length > 0 && (
          <section className="border-t border-gray-200">
            <div className="container py-8 sm:py-10">
              <h2 className="text-lg font-bold text-ink sm:text-xl">
                {vehicle.name} parts: common questions
              </h2>
              <div className="mt-4 divide-y divide-gray-200 rounded-xl border border-gray-200">
                {vehicle.faqs.map(faq => (
                  <details key={faq.question} className="group px-4 sm:px-5">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold text-ink sm:text-base [&::-webkit-details-marker]:hidden">
                      {faq.question}
                      <span
                        aria-hidden="true"
                        className="flex-none text-gray-400 transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="pb-4 text-sm leading-relaxed text-gray-700">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {(vehicleCategories.length > 0 || guides.length > 0) && (
          <section className="border-t border-gray-200">
            <div className="container space-y-8 py-8 sm:py-10">
              {vehicleCategories.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    {vehicle.name} parts by category
                  </h2>
                  <RelatedLinks
                    className="mt-4"
                    links={vehicleCategories.map(name => ({
                      href: categoryHrefFor(categories, name),
                      label: name,
                    }))}
                  />
                </div>
              )}
              {guides.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    Guides for {vehicle.name} owners
                  </h2>
                  <RelatedLinks className="mt-4" links={guides} />
                </div>
              )}
            </div>
          </section>
        )}

        <section className="border-t border-gray-200 bg-gray-50">
          <div className="container py-8 sm:py-10">
            <h2 className="text-lg font-bold text-ink">Shop by vehicle</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {otherVehicles.map(v => (
                <li key={v.slug}>
                  <Link
                    href={`/vehicle/${v.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-gray-300 bg-white px-4 text-sm font-medium text-ink hover:border-ink sm:min-h-10"
                  >
                    {v.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}

function NotFoundForVehicle() {
  useMarkNotFound();
  return <NotFound />;
}
