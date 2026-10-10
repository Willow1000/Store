import { VEHICLES } from "@shared/vehicleContent";
import {
  getAllSupabaseProducts,
  getSupabaseCategories,
} from "./supabaseProducts";
import { BLOG_POSTS } from "../shared/blogPosts";

type SitemapKind = "site" | "products";

export async function generateSitemap(
  baseUrl: string,
  kind: SitemapKind = "site"
): Promise<string> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  // The product sitemap is the primary discovery path for product pages, so it
  // reads the live Supabase table directly. db.ts's Drizzle product schema
  // targets different column names than the real table (integer ids + `name`
  // vs uuid ids + `title`), so selecting through it yielded zero rows and the
  // product sitemap shipped containing nothing but /products itself. See
  // server/supabaseProducts.ts for the same mismatch documented against the
  // catalog queries.
  if (kind === "products") {
    const supabaseProducts = await getAllSupabaseProducts(50000);
    if (supabaseProducts.length === 0) {
      return generateBasicSitemap(normalizedBaseUrl, kind);
    }
    let xml = createUrlsetOpen(true);
    supabaseProducts.forEach((product: any) => {
      xml += renderProductUrl(normalizedBaseUrl, product);
    });
    xml += "</urlset>";
    return xml;
  }

  // Categories come from the live Supabase table for the same reason as the
  // products above: the Drizzle schema does not describe it, and without a
  // Drizzle connection this used to fall back to a sitemap with no category
  // pages in it at all.
  const allCategories = await getSupabaseCategories();
  let xml = generateBasicSitemap(normalizedBaseUrl, kind).replace(
    /<\/urlset>\s*$/,
    ""
  );

  // Vehicle, category and static pages carry no <lastmod>: nothing tracks when
  // they really changed, and stamping every one with today's date on each
  // request teaches crawlers to distrust the whole file's dates.
  VEHICLES.forEach(vehicle => {
    xml += renderUrl({
      loc: `${normalizedBaseUrl}/vehicle/${vehicle.slug}`,
    });
  });

  allCategories.forEach(category => {
    const categoryValue = String(category.slug || category.name || "").trim();
    if (!categoryValue) return;

    xml += renderUrl({
      loc: `${normalizedBaseUrl}/products?category=${encodeURIComponent(categoryValue)}`,
    });
  });

  xml += "</urlset>";
  return xml;
}

function generateBasicSitemap(baseUrl: string, kind: SitemapKind): string {
  let xml = createUrlsetOpen(false);

  if (kind === "products") {
    // Fallback product sitemap when product data is unavailable.
    xml += renderUrl({ loc: `${baseUrl}/products` });
    xml += "</urlset>";
    return xml;
  }

  const pages = [
    "/",
    "/products",
    "/blog",
    "/site-map",
    "/about",
    "/help",
    "/contact",
    "/shipping",
    "/returns",
    "/faq",
    "/vin-decoder",
    "/nl/auto-motorblokken",
    "/privacy",
    "/terms",
    "/cookies",
    "/accessibility",
  ];

  pages.forEach(page => {
    xml += renderUrl({ loc: `${baseUrl}${page}` });
  });

  BLOG_POSTS.forEach(post => {
    xml += renderUrl({
      loc: `${baseUrl}/blog/${post.slug}`,
      lastmod: post.updatedDate || post.publishedDate,
    });
  });

  xml += "</urlset>";

  return xml;
}

function createUrlsetOpen(withImages: boolean): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  if (withImages) {
    xml +=
      '\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
  }
  xml += ">\n";
  return xml;
}

// <changefreq> and <priority> are not emitted: Google ignores both.
function renderUrl({
  loc,
  lastmod,
}: {
  loc: string;
  lastmod?: string;
}): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    "  </url>",
    "",
  ].join("\n");
}

function renderProductUrl(baseUrl: string, product: any): string {
  const updatedAt =
    product.updatedAt ||
    product.updated_at ||
    product.createdAt ||
    product.created_at;
  const updatedTime = updatedAt ? new Date(updatedAt).getTime() : NaN;
  const lastmod = Number.isNaN(updatedTime)
    ? undefined
    : new Date(updatedTime).toISOString().split("T")[0];
  const images = normalizeImages(
    product.images ||
      product.image_urls ||
      product.coverImageUrl ||
      product.cover_image_url,
    baseUrl
  );

  let xml = [
    "  <url>",
    `    <loc>${escapeXml(`${baseUrl}/product/${product.id}`)}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
  ].join("\n");

  // Only <image:loc>: Google dropped <image:title> and <image:caption> from
  // the image sitemap extension, and the captions (product descriptions up to
  // 2048 characters) made up most of the file.
  images.slice(0, 1000).forEach(image => {
    xml += "\n    <image:image>";
    xml += `\n      <image:loc>${escapeXml(image)}</image:loc>`;
    xml += "\n    </image:image>";
  });

  xml += "\n  </url>\n";
  return xml;
}

function normalizeImages(value: unknown, baseUrl: string): string[] {
  let images = value;

  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [images];
    }
  }

  const rawImages = Array.isArray(images) ? images : images ? [images] : [];

  return Array.from(
    new Set(
      rawImages
        .map(image => {
          if (typeof image === "string") return image;
          if (image && typeof image === "object" && "url" in image)
            return String((image as any).url || "");
          if (image && typeof image === "object" && "image_url" in image)
            return String((image as any).image_url || "");
          return "";
        })
        .map(image => image.trim())
        .filter(Boolean)
        .map(image => {
          try {
            return new URL(image, baseUrl).href;
          } catch {
            return image;
          }
        })
    )
  );
}

// Helper function to escape XML special characters
function escapeXml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
