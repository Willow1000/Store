import { useEffect } from 'react';

/**
 * Dynamic SEO Head component for per-page meta tags and structured data
 * Use this component in each page to customize SEO meta tags
 */

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  robots?: string;
  ogImage?: string;
  ogType?: 'website' | 'product' | 'article';
  keywords?: string[];
  // For product pages
  productData?: {
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
    url?: string;
    condition?: string;
  };
  // For article/blog pages
  articleData?: {
    author?: string;
    publishedDate?: string;
    modifiedDate?: string;
    image?: string;
  };
  // For breadcrumbs
  breadcrumbs?: Array<{
    name: string;
    url: string;
  }>;
}

const SITE_NAME = 'MotorVault';
const SITE_DESCRIPTION = 'Premium automotive parts marketplace for OEM and aftermarket motor parts, accessories, secure checkout, and worldwide shipping.';
const SITE_LOGO = '/images/motorvault_horizontal.svg';
const DEFAULT_SITE_ORIGIN = (
  import.meta.env.VITE_APP_URL ||
  import.meta.env.VITE_SITE_URL ||
  'https://motorvault.shop'
).replace(/\/$/, '');

function getRuntimeSiteOrigin(): string {
  if (typeof window === 'undefined') return DEFAULT_SITE_ORIGIN;

  const currentOrigin = window.location.origin.replace(/\/$/, '');

  try {
    const hostname = new URL(currentOrigin).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return currentOrigin;
    }
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }

  return DEFAULT_SITE_ORIGIN || currentOrigin;
}

function normalizeCanonicalUrl(canonical?: string): string | undefined {
  if (!canonical) return undefined;
  const siteOrigin = getRuntimeSiteOrigin();

  try {
    const parsed = new URL(canonical, siteOrigin);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
    return `${siteOrigin}${path.startsWith('/') ? path : `/${path}`}`;
  } catch {
    const fallbackPath = canonical.startsWith('/') ? canonical : `/${canonical}`;
    return `${siteOrigin}${fallbackPath}`;
  }
}

function getCurrentUrl(): string {
  return typeof window !== 'undefined' ? window.location.href : '';
}

function toAbsoluteUrl(value?: string, baseUrl?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:')) return undefined;

  try {
    const base = baseUrl || getRuntimeSiteOrigin();
    return new URL(trimmed, base).href;
  } catch {
    return trimmed;
  }
}

function normalizeImageList(productData: NonNullable<SEOHeadProps['productData']>, baseUrl?: string): string[] {
  const rawImages = [
    ...(Array.isArray(productData.image) ? productData.image : productData.image ? [productData.image] : []),
    ...(productData.images || []),
  ];

  return Array.from(
    new Set(
      rawImages
        .map((image) => toAbsoluteUrl(image, baseUrl))
        .filter((image): image is string => Boolean(image))
    )
  );
}

function formatSchemaPrice(price: number | string): string | undefined {
  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) return undefined;
  return numericPrice.toFixed(2);
}

function getSchemaCondition(condition?: string): string | undefined {
  if (!condition) return undefined;
  const normalized = condition.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes('new')) return 'https://schema.org/NewCondition';
  if (normalized.includes('refurb')) return 'https://schema.org/RefurbishedCondition';
  if (normalized.includes('damaged')) return 'https://schema.org/DamagedCondition';
  return 'https://schema.org/UsedCondition';
}

function getStructuredDataUrl(url?: string, fallback?: string): string {
  return toAbsoluteUrl(url || fallback, fallback || getRuntimeSiteOrigin()) || fallback || getCurrentUrl();
}

function getRobotsContent(noIndex?: boolean, noFollow?: boolean, robots?: string): string {
  if (robots?.trim()) return robots.trim();

  return [
    noIndex ? 'noindex' : 'index',
    noFollow ? 'nofollow' : 'follow',
    'max-image-preview:large',
    'max-snippet:-1',
    'max-video-preview:-1',
  ].join(', ');
}

export function SEOHead({
  title = 'MotorVault - Premium Motor Products from Verified Sellers',
  description = 'Discover thousands of premium motor products from verified sellers. Quality guaranteed, fast shipping, and secure checkout on every purchase.',
  canonical,
  noIndex = false,
  noFollow = false,
  robots,
  ogImage = 'https://motorvault.shop/og-image.png',
  ogType = 'website',
  keywords = [],
  productData,
  articleData,
  breadcrumbs,
}: SEOHeadProps) {
  const effectiveCanonical = normalizeCanonicalUrl(canonical);
  const currentUrl = getCurrentUrl();
  const pageUrl = effectiveCanonical || currentUrl;
  const siteOrigin = getRuntimeSiteOrigin();
  const normalizedOgImage = toAbsoluteUrl(ogImage, pageUrl) || ogImage;
  const robotsContent = getRobotsContent(noIndex, noFollow, robots);

  // Generate and inject structured data
  const graph: Record<string, any>[] = [
    {
      '@type': 'Organization',
      '@id': `${siteOrigin}#organization`,
      name: SITE_NAME,
      url: siteOrigin,
      logo: toAbsoluteUrl(SITE_LOGO, siteOrigin),
      description: SITE_DESCRIPTION,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Support',
        email: 'support@motorvault.shop',
        availableLanguage: 'en',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${siteOrigin}#website`,
      name: SITE_NAME,
      url: siteOrigin,
      description: SITE_DESCRIPTION,
      inLanguage: 'en',
      publisher: {
        '@id': `${siteOrigin}#organization`,
      },
    },
  ];

  if (productData) {
    const productUrl = getStructuredDataUrl(productData.url, pageUrl);
    const productSchema: Record<string, any> = {
      '@type': 'Product',
      '@id': `${productUrl}#product`,
      name: productData.name,
      description: productData.description || description,
      url: productUrl,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': productUrl,
      },
    };

    const imageList = normalizeImageList(productData, pageUrl);
    if (imageList.length > 0) {
      productSchema.image = imageList;
    }

    if (productData.sku) {
      productSchema.sku = productData.sku;
    }

    if (productData.mpn) {
      productSchema.mpn = productData.mpn;
    }

    if (productData.brand) {
      productSchema.brand = {
        '@type': 'Brand',
        name: productData.brand,
      };
    }

    if (productData.category) {
      productSchema.category = productData.category;
    }

    const formattedPrice = formatSchemaPrice(productData.price);
    if (formattedPrice) {
      productSchema.offers = {
        '@type': 'Offer',
        url: productUrl,
        price: formattedPrice,
        priceCurrency: (productData.priceCurrency || 'USD').toUpperCase(),
        availability: `https://schema.org/${productData.availability || 'InStock'}`,
      };

      const itemCondition = getSchemaCondition(productData.condition);
      if (itemCondition) {
        productSchema.offers.itemCondition = itemCondition;
      }
    }

    if (productData.rating && productData.reviews && productData.reviews > 0) {
      productSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: productData.rating,
        reviewCount: productData.reviews,
      };
    }

    graph.push(productSchema);
  } else if (articleData) {
    const articleSchema: Record<string, any> = {
      '@type': 'Article',
      headline: title,
      description,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': pageUrl,
      },
    };
    
    if (articleData.image) {
      articleSchema.image = toAbsoluteUrl(articleData.image, pageUrl) || articleData.image;
    }
    if (articleData.author) {
      articleSchema.author = {
        '@type': 'Person',
        name: articleData.author,
      };
    }
    if (articleData.publishedDate) {
      articleSchema.datePublished = articleData.publishedDate;
    }
    if (articleData.modifiedDate) {
      articleSchema.dateModified = articleData.modifiedDate;
    }

    graph.push(articleSchema);
  } else {
    graph.push({
      '@type': 'WebPage',
      '@id': `${pageUrl}#webpage`,
      name: title,
      description,
      url: pageUrl,
    });
  }

  // Add breadcrumb structured data
  if (breadcrumbs && breadcrumbs.length > 0) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: getStructuredDataUrl(item.url, pageUrl),
      })),
    });
  }

  const structuredData =
    graph.length === 1
      ? { '@context': 'https://schema.org/', ...graph[0] }
      : { '@context': 'https://schema.org/', '@graph': graph };
  const structuredDataJson = JSON.stringify(structuredData);
  const keywordsContent = keywords.join(', ');

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.title = title;

    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let element = document.querySelector(selector);

      if (!element) {
        element = document.createElement('meta');
        if (isProperty) {
          element.setAttribute('property', name);
        } else {
          element.setAttribute('name', name);
        }
        document.head.appendChild(element);
      }

      element.setAttribute('content', content);
    };

    setMetaTag('description', description);
    setMetaTag('robots', robotsContent);
    if (keywordsContent) {
      setMetaTag('keywords', keywordsContent);
    }

    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:image', normalizedOgImage, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:url', pageUrl, true);

    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title, true);
    setMetaTag('twitter:description', description, true);
    setMetaTag('twitter:image', normalizedOgImage, true);

    if (pageUrl) {
      let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = pageUrl;
    }

    let scriptTag = document.querySelector('script[data-seo-head="true"]') as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      scriptTag.setAttribute('data-seo-head', 'true');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = structuredDataJson;
  }, [description, keywordsContent, normalizedOgImage, ogType, pageUrl, robotsContent, structuredDataJson, title]);

  return null;
}

export default SEOHead;
