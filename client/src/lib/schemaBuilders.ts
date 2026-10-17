import { calculateShipping } from "@shared/shipping";
import { RETURN_WINDOW_DAYS, SHIPPING_COUNTRIES } from "@shared/storePolicy";
import { SEO_CONFIG } from "@/lib/seoConfig";

export type SEOPageType =
  | "generic"
  | "homepage"
  | "category"
  | "product"
  | "article"
  | "faq"
  | "contact"
  | "about"
  | "policy"
  | "search";

export type BreadcrumbItem = {
  name: string;
  url: string;
};

export type ProductSchemaInput = {
  name: string;
  price: number | string;
  priceCurrency?: string;
  originalPrice?: number;
  rating?: number;
  reviews?: number;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  image?: string | string[];
  images?: string[];
  category?: string;
  description?: string;
  sku?: string;
  brand?: string;
  mpn?: string;
  gtin?: string;
  url?: string;
  condition?: string;
  shippingDetails?: Record<string, unknown>;
  hasMerchantReturnPolicy?: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * Shipping and returns for a product's Offer - required for Google merchant
 * listings - built from the same facts checkout and the policy pages use:
 * shipping is calculateShipping() (5% of the order, free from $1,500), and
 * returns are the 30-day mail-in policy on /returns.
 */
export function buildOfferPolicies(priceUsd: number): {
  shippingDetails: Record<string, unknown>;
  hasMerchantReturnPolicy: Record<string, unknown>[];
} {
  const destinations = SHIPPING_COUNTRIES.map(country => ({
    "@type": "DefinedRegion",
    addressCountry: country,
  }));
  // Google accepts at most 50 applicableCountry values per return policy, so
  // the same policy is repeated for each block of up to 50 countries.
  const countryBlocks: string[][] = [];
  for (let i = 0; i < SHIPPING_COUNTRIES.length; i += 50) {
    countryBlocks.push(SHIPPING_COUNTRIES.slice(i, i + 50));
  }
  return {
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: calculateShipping(priceUsd).toFixed(2),
        currency: "USD",
      },
      shippingDestination: destinations,
    },
    hasMerchantReturnPolicy: countryBlocks.map(countries => ({
      "@type": "MerchantReturnPolicy",
      applicableCountry: countries,
      returnPolicyCategory:
        "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: RETURN_WINDOW_DAYS,
      returnMethod: "https://schema.org/ReturnByMail",
      // /returns: we send a prepaid label, so return postage is free.
      returnFees: "https://schema.org/FreeReturn",
    })),
  };
}

export type ArticleSchemaInput = {
  author?: string;
  authorType?: "Person" | "Organization";
  publishedDate?: string;
  modifiedDate?: string;
  image?: string;
};

export type FAQSchemaInput = {
  question: string;
  answer: string;
};

type BuildSchemaOptions = {
  pageType: SEOPageType;
  title: string;
  description: string;
  pageUrl: string;
  siteOrigin: string;
  language: string;
  productData?: ProductSchemaInput;
  articleData?: ArticleSchemaInput;
  breadcrumbs?: BreadcrumbItem[];
  faqData?: FAQSchemaInput[];
  /** Products shown on a listing page, in display order. */
  itemList?: BreadcrumbItem[];
};

function toAbsoluteUrl(value?: string, baseUrl?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:")) return undefined;

  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return undefined;
  }
}

function normalizePrice(price: number | string): string | undefined {
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  return amount.toFixed(2);
}

function normalizeCondition(condition?: string): string | undefined {
  if (!condition) return undefined;
  const normalized = condition.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("damaged"))
    return "https://schema.org/DamagedCondition";
  if (normalized.includes("refurb") || normalized.includes("reman"))
    return "https://schema.org/RefurbishedCondition";
  // "Like new" and "as new" describe a used item; only a plain "new" is new.
  if (/\b(like|as|nearly|almost)[\s-]+new\b/.test(normalized))
    return "https://schema.org/UsedCondition";
  if (/\bnew\b/.test(normalized)) return "https://schema.org/NewCondition";
  return "https://schema.org/UsedCondition";
}

function normalizeImageList(
  input: ProductSchemaInput,
  pageUrl: string
): string[] {
  const raw = [
    ...(Array.isArray(input.image)
      ? input.image
      : input.image
        ? [input.image]
        : []),
    ...(input.images || []),
  ];

  return Array.from(
    new Set(
      raw
        .map(image => toAbsoluteUrl(image, pageUrl))
        .filter((image): image is string => Boolean(image))
    )
  );
}

function stripEmpty<T>(value: T): T {
  if (Array.isArray(value)) {
    const normalized = value
      .map(entry => stripEmpty(entry))
      .filter(entry => {
        if (entry === null || entry === undefined) return false;
        if (typeof entry === "string" && entry.trim() === "") return false;
        if (Array.isArray(entry) && entry.length === 0) return false;
        if (
          typeof entry === "object" &&
          !Array.isArray(entry) &&
          Object.keys(entry as Record<string, unknown>).length === 0
        ) {
          return false;
        }
        return true;
      });
    return normalized as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, stripEmpty(entry)] as const)
      .filter(([, entry]) => {
        if (entry === null || entry === undefined) return false;
        if (typeof entry === "string" && entry.trim() === "") return false;
        if (Array.isArray(entry) && entry.length === 0) return false;
        if (
          typeof entry === "object" &&
          !Array.isArray(entry) &&
          Object.keys(entry as Record<string, unknown>).length === 0
        ) {
          return false;
        }
        return true;
      });
    return Object.fromEntries(entries) as T;
  }

  return value;
}

function buildOrganization(siteOrigin: string, language: string) {
  const logoUrl = toAbsoluteUrl(SEO_CONFIG.site.logo, siteOrigin);
  const socialProfiles = Object.values(SEO_CONFIG.contact.social || {}).filter(
    Boolean
  );

  return stripEmpty({
    "@type": "Organization",
    "@id": `${siteOrigin}#organization`,
    name: SEO_CONFIG.site.name,
    url: siteOrigin,
    logo: logoUrl,
    description: SEO_CONFIG.site.description,
    sameAs: socialProfiles,
    address: SEO_CONFIG.contact.address.street
      ? {
          "@type": "PostalAddress",
          streetAddress: SEO_CONFIG.contact.address.street,
          addressLocality: SEO_CONFIG.contact.address.city,
          addressRegion: SEO_CONFIG.contact.address.state,
          postalCode: SEO_CONFIG.contact.address.zipCode,
          addressCountry: SEO_CONFIG.contact.address.country,
        }
      : undefined,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: SEO_CONFIG.contact.email,
      ...(SEO_CONFIG.contact.phone
        ? { telephone: SEO_CONFIG.contact.phone }
        : {}),
      availableLanguage: Array.from(new Set([language, "en"])),
    },
  });
}

function buildWebsite(siteOrigin: string, includeSearchAction: boolean) {
  const website: Record<string, unknown> = {
    "@type": "WebSite",
    "@id": `${siteOrigin}#website`,
    name: SEO_CONFIG.site.name,
    url: siteOrigin,
    description: SEO_CONFIG.site.description,
    publisher: {
      "@id": `${siteOrigin}#organization`,
    },
  };

  if (includeSearchAction) {
    website.potentialAction = {
      "@type": "SearchAction",
      target: `${siteOrigin}/products?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    };
  }

  return stripEmpty(website);
}

function buildPageEntity(options: BuildSchemaOptions): Record<string, unknown> {
  const { pageType, title, description, pageUrl, articleData, faqData } =
    options;

  if (pageType === "article" && articleData) {
    return stripEmpty({
      "@type": "BlogPosting",
      "@id": `${pageUrl}#article`,
      headline: title,
      description,
      image: toAbsoluteUrl(articleData.image, pageUrl),
      datePublished: articleData.publishedDate,
      dateModified: articleData.modifiedDate || articleData.publishedDate,
      // A byline like "MotorVault Editorial Team" is the organisation, not a
      // person; marking it up as a Person is a false authorship signal.
      author: articleData.author
        ? articleData.authorType === "Organization"
          ? {
              "@type": "Organization",
              name: articleData.author,
              url: options.siteOrigin,
            }
          : {
              "@type": "Person",
              name: articleData.author,
            }
        : undefined,
      publisher: {
        "@id": `${options.siteOrigin}#organization`,
      },
      mainEntityOfPage: pageUrl,
    });
  }

  if (pageType === "faq" && Array.isArray(faqData) && faqData.length > 0) {
    return stripEmpty({
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: faqData
        .filter(item => item.question?.trim() && item.answer?.trim())
        .map(item => ({
          "@type": "Question",
          name: item.question.trim(),
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer.trim(),
          },
        })),
    });
  }

  if (pageType === "contact") {
    return stripEmpty({
      "@type": "ContactPage",
      "@id": `${pageUrl}#contact`,
      name: title,
      description,
      url: pageUrl,
      mainEntity: {
        "@id": `${options.siteOrigin}#organization`,
      },
    });
  }

  if (pageType === "about") {
    return stripEmpty({
      "@type": "AboutPage",
      "@id": `${pageUrl}#about`,
      name: title,
      description,
      url: pageUrl,
      mainEntity: {
        "@id": `${options.siteOrigin}#organization`,
      },
    });
  }

  if (pageType === "category" || pageType === "search") {
    const items = (options.itemList || []).filter(
      item => item?.name?.trim() && item?.url?.trim()
    );
    return stripEmpty({
      "@type": "CollectionPage",
      "@id": `${pageUrl}#collection`,
      name: title,
      description,
      url: pageUrl,
      mainEntity: items.length
        ? {
            "@type": "ItemList",
            numberOfItems: items.length,
            itemListElement: items.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name.trim(),
              url: toAbsoluteUrl(item.url, pageUrl),
            })),
          }
        : undefined,
    });
  }

  return stripEmpty({
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    name: title,
    description,
    url: pageUrl,
  });
}

function buildProduct(
  options: BuildSchemaOptions
): Record<string, unknown> | null {
  const input = options.productData;
  if (!input?.name) return null;

  const productUrl =
    toAbsoluteUrl(input.url || options.pageUrl, options.pageUrl) ||
    options.pageUrl;
  const imageList = normalizeImageList(input, options.pageUrl);
  const price = normalizePrice(input.price);
  const offerCurrency = (input.priceCurrency || "USD").toUpperCase();
  const condition = normalizeCondition(input.condition);

  const product: Record<string, unknown> = {
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: input.name,
    description: input.description || options.description,
    url: productUrl,
    image: imageList,
    sku: input.sku,
    mpn: input.mpn,
    gtin: input.gtin,
    category: input.category,
    brand: input.brand
      ? {
          "@type": "Brand",
          name: input.brand,
        }
      : undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": productUrl,
    },
  };

  if (price) {
    product.offers = stripEmpty({
      "@type": "Offer",
      url: productUrl,
      price,
      priceCurrency: offerCurrency,
      // The struck-through "was" price shown on the page.
      priceSpecification:
        Number(input.originalPrice) > Number(price)
          ? {
              "@type": "UnitPriceSpecification",
              priceType: "https://schema.org/ListPrice",
              price: Number(input.originalPrice).toFixed(2),
              priceCurrency: offerCurrency,
            }
          : undefined,
      availability: `https://schema.org/${input.availability || "InStock"}`,
      itemCondition: condition,
      shippingDetails: input.shippingDetails,
      hasMerchantReturnPolicy: input.hasMerchantReturnPolicy,
    });
  }

  if (
    Number.isFinite(Number(input.rating)) &&
    Number(input.rating) > 0 &&
    Number.isFinite(Number(input.reviews)) &&
    Number(input.reviews) > 0
  ) {
    product.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(input.rating),
      reviewCount: Number(input.reviews),
    };
  }

  return stripEmpty(product);
}

function buildBreadcrumbs(
  breadcrumbs: BreadcrumbItem[] | undefined,
  pageUrl: string
): Record<string, unknown> | null {
  if (!Array.isArray(breadcrumbs) || breadcrumbs.length === 0) return null;

  const list = breadcrumbs
    .filter(entry => entry?.name?.trim() && entry?.url?.trim())
    .map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name.trim(),
      item: toAbsoluteUrl(entry.url, pageUrl) || entry.url,
    }));

  if (list.length === 0) return null;

  return {
    "@type": "BreadcrumbList",
    itemListElement: list,
  };
}

function buildFaqPage(
  faqData: FAQSchemaInput[] | undefined,
  pageUrl: string
): Record<string, unknown> | null {
  if (!Array.isArray(faqData) || faqData.length === 0) return null;

  const mainEntity = faqData
    .filter(item => item.question?.trim() && item.answer?.trim())
    .map(item => ({
      "@type": "Question",
      name: item.question.trim(),
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer.trim(),
      },
    }));

  if (mainEntity.length === 0) return null;

  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity,
  };
}

export function buildStructuredDataGraph(
  options: BuildSchemaOptions
): Record<string, unknown> {
  const graph: Record<string, unknown>[] = [];

  graph.push(buildOrganization(options.siteOrigin, options.language));
  graph.push(
    buildWebsite(
      options.siteOrigin,
      options.pageType === "homepage" || options.pageType === "search"
    )
  );
  graph.push(buildPageEntity(options));

  const product = buildProduct(options);
  if (product) {
    graph.push(product);
  }

  const breadcrumbs = buildBreadcrumbs(options.breadcrumbs, options.pageUrl);
  if (breadcrumbs) {
    graph.push(breadcrumbs);
  }

  // On the FAQ page itself the page entity already IS the FAQPage (same @id);
  // adding the generic one as well emitted the same node twice.
  const faqPage =
    options.pageType === "faq"
      ? null
      : buildFaqPage(options.faqData, options.pageUrl);
  if (faqPage) {
    graph.push(faqPage);
  }

  return stripEmpty({
    "@context": "https://schema.org",
    "@graph": graph,
  });
}
