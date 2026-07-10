import { SEO_CONFIG } from '@/lib/seoConfig';

export type SEOPageType =
  | 'generic'
  | 'homepage'
  | 'category'
  | 'product'
  | 'article'
  | 'faq'
  | 'contact'
  | 'about'
  | 'policy'
  | 'search';

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
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
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
  hasMerchantReturnPolicy?: Record<string, unknown>;
};

export type ArticleSchemaInput = {
  author?: string;
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
};

function toAbsoluteUrl(value?: string, baseUrl?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:')) return undefined;

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
  if (normalized.includes('new')) return 'https://schema.org/NewCondition';
  if (normalized.includes('refurb')) return 'https://schema.org/RefurbishedCondition';
  if (normalized.includes('damaged')) return 'https://schema.org/DamagedCondition';
  return 'https://schema.org/UsedCondition';
}

function normalizeImageList(input: ProductSchemaInput, pageUrl: string): string[] {
  const raw = [
    ...(Array.isArray(input.image) ? input.image : input.image ? [input.image] : []),
    ...(input.images || []),
  ];

  return Array.from(
    new Set(
      raw
        .map((image) => toAbsoluteUrl(image, pageUrl))
        .filter((image): image is string => Boolean(image))
    )
  );
}

function stripEmpty<T>(value: T): T {
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => stripEmpty(entry))
      .filter((entry) => {
        if (entry === null || entry === undefined) return false;
        if (typeof entry === 'string' && entry.trim() === '') return false;
        if (Array.isArray(entry) && entry.length === 0) return false;
        if (typeof entry === 'object' && !Array.isArray(entry) && Object.keys(entry as Record<string, unknown>).length === 0) {
          return false;
        }
        return true;
      });
    return normalized as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, stripEmpty(entry)] as const)
      .filter(([, entry]) => {
        if (entry === null || entry === undefined) return false;
        if (typeof entry === 'string' && entry.trim() === '') return false;
        if (Array.isArray(entry) && entry.length === 0) return false;
        if (typeof entry === 'object' && !Array.isArray(entry) && Object.keys(entry as Record<string, unknown>).length === 0) {
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
  const socialProfiles = Object.values(SEO_CONFIG.contact.social || {}).filter(Boolean);

  return stripEmpty({
    '@type': 'Organization',
    '@id': `${siteOrigin}#organization`,
    name: SEO_CONFIG.site.name,
    url: siteOrigin,
    logo: logoUrl,
    description: SEO_CONFIG.site.description,
    sameAs: socialProfiles,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: SEO_CONFIG.contact.email,
      telephone: SEO_CONFIG.contact.phone,
      availableLanguage: [language, 'en'],
    },
  });
}

function buildWebsite(siteOrigin: string, includeSearchAction: boolean) {
  const website: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': `${siteOrigin}#website`,
    name: SEO_CONFIG.site.name,
    url: siteOrigin,
    description: SEO_CONFIG.site.description,
    publisher: {
      '@id': `${siteOrigin}#organization`,
    },
  };

  if (includeSearchAction) {
    website.potentialAction = {
      '@type': 'SearchAction',
      target: `${siteOrigin}/products?query={search_term_string}`,
      'query-input': 'required name=search_term_string',
    };
  }

  return stripEmpty(website);
}

function buildPageEntity(options: BuildSchemaOptions): Record<string, unknown> {
  const { pageType, title, description, pageUrl, articleData, faqData } = options;

  if (pageType === 'article' && articleData) {
    return stripEmpty({
      '@type': 'BlogPosting',
      '@id': `${pageUrl}#article`,
      headline: title,
      description,
      image: toAbsoluteUrl(articleData.image, pageUrl),
      datePublished: articleData.publishedDate,
      dateModified: articleData.modifiedDate || articleData.publishedDate,
      author: articleData.author
        ? {
            '@type': 'Person',
            name: articleData.author,
          }
        : undefined,
      publisher: {
        '@id': `${options.siteOrigin}#organization`,
      },
      mainEntityOfPage: pageUrl,
    });
  }

  if (pageType === 'faq' && Array.isArray(faqData) && faqData.length > 0) {
    return stripEmpty({
      '@type': 'FAQPage',
      '@id': `${pageUrl}#faq`,
      mainEntity: faqData
        .filter((item) => item.question?.trim() && item.answer?.trim())
        .map((item) => ({
          '@type': 'Question',
          name: item.question.trim(),
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer.trim(),
          },
        })),
    });
  }

  if (pageType === 'contact') {
    return stripEmpty({
      '@type': 'ContactPage',
      '@id': `${pageUrl}#contact`,
      name: title,
      description,
      url: pageUrl,
      mainEntity: {
        '@id': `${options.siteOrigin}#organization`,
      },
    });
  }

  if (pageType === 'about') {
    return stripEmpty({
      '@type': 'AboutPage',
      '@id': `${pageUrl}#about`,
      name: title,
      description,
      url: pageUrl,
      mainEntity: {
        '@id': `${options.siteOrigin}#organization`,
      },
    });
  }

  if (pageType === 'category' || pageType === 'search') {
    return stripEmpty({
      '@type': 'CollectionPage',
      '@id': `${pageUrl}#collection`,
      name: title,
      description,
      url: pageUrl,
    });
  }

  return stripEmpty({
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    name: title,
    description,
    url: pageUrl,
  });
}

function buildProduct(options: BuildSchemaOptions): Record<string, unknown> | null {
  const input = options.productData;
  if (!input?.name) return null;

  const productUrl = toAbsoluteUrl(input.url || options.pageUrl, options.pageUrl) || options.pageUrl;
  const imageList = normalizeImageList(input, options.pageUrl);
  const price = normalizePrice(input.price);
  const offerCurrency = (input.priceCurrency || 'USD').toUpperCase();
  const condition = normalizeCondition(input.condition);

  const product: Record<string, unknown> = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
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
          '@type': 'Brand',
          name: input.brand,
        }
      : undefined,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': productUrl,
    },
  };

  if (price) {
    product.offers = stripEmpty({
      '@type': 'Offer',
      url: productUrl,
      price,
      priceCurrency: offerCurrency,
      availability: `https://schema.org/${input.availability || 'InStock'}`,
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
      '@type': 'AggregateRating',
      ratingValue: Number(input.rating),
      reviewCount: Number(input.reviews),
    };
  }

  return stripEmpty(product);
}

function buildBreadcrumbs(
  breadcrumbs: BreadcrumbItem[] | undefined,
  pageUrl: string,
): Record<string, unknown> | null {
  if (!Array.isArray(breadcrumbs) || breadcrumbs.length === 0) return null;

  const list = breadcrumbs
    .filter((entry) => entry?.name?.trim() && entry?.url?.trim())
    .map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name.trim(),
      item: toAbsoluteUrl(entry.url, pageUrl) || entry.url,
    }));

  if (list.length === 0) return null;

  return {
    '@type': 'BreadcrumbList',
    itemListElement: list,
  };
}

function buildFaqPage(faqData: FAQSchemaInput[] | undefined, pageUrl: string): Record<string, unknown> | null {
  if (!Array.isArray(faqData) || faqData.length === 0) return null;

  const mainEntity = faqData
    .filter((item) => item.question?.trim() && item.answer?.trim())
    .map((item) => ({
      '@type': 'Question',
      name: item.question.trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.trim(),
      },
    }));

  if (mainEntity.length === 0) return null;

  return {
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity,
  };
}

export function buildStructuredDataGraph(options: BuildSchemaOptions): Record<string, unknown> {
  const graph: Record<string, unknown>[] = [];

  graph.push(buildOrganization(options.siteOrigin, options.language));
  graph.push(buildWebsite(options.siteOrigin, options.pageType === 'homepage' || options.pageType === 'search'));
  graph.push(buildPageEntity(options));

  const product = buildProduct(options);
  if (product) {
    graph.push(product);
  }

  const breadcrumbs = buildBreadcrumbs(options.breadcrumbs, options.pageUrl);
  if (breadcrumbs) {
    graph.push(breadcrumbs);
  }

  const faqPage = buildFaqPage(options.faqData, options.pageUrl);
  if (faqPage) {
    graph.push(faqPage);
  }

  return stripEmpty({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}
