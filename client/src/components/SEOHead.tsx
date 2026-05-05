/**
 * Dynamic SEO Head component for per-page meta tags and structured data
 * Use this component in each page to customize SEO meta tags
 */

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'product' | 'article';
  keywords?: string[];
  // For product pages
  productData?: {
    name: string;
    price: number;
    originalPrice?: number;
    rating?: number;
    reviews?: number;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    image?: string;
    category?: string;
    description?: string;
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

export function SEOHead({
  title = 'MotorVault - Premium Motor Products from Verified Sellers',
  description = 'Discover thousands of premium motor products from verified sellers. Quality guaranteed, fast shipping, and secure checkout on every purchase.',
  canonical,
  ogImage = 'https://motorvault.com/og-image.png',
  ogType = 'website',
  keywords = [],
  productData,
  articleData,
  breadcrumbs,
}: SEOHeadProps) {
  // Update document title
  if (typeof document !== 'undefined') {
    document.title = title;
  }

  // Update or create meta tags
  const setMetaTag = (name: string, content: string, isProperty = false) => {
    if (typeof document === 'undefined') return;
    
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

  // Standard meta tags
  setMetaTag('description', description);
  if (keywords.length > 0) {
    setMetaTag('keywords', keywords.join(', '));
  }

  // Open Graph
  setMetaTag('og:title', title, true);
  setMetaTag('og:description', description, true);
  setMetaTag('og:image', ogImage, true);
  setMetaTag('og:type', ogType, true);
  setMetaTag('og:url', canonical || window.location.href, true);

  // Twitter
  setMetaTag('twitter:title', title, true);
  setMetaTag('twitter:description', description, true);
  setMetaTag('twitter:image', ogImage, true);

  // Canonical URL
  if (canonical) {
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;
  }

  // Generate and inject structured data
  const structuredData: any = {
    '@context': 'https://schema.org',
  };

  if (productData) {
    structuredData['@type'] = 'Product';
    structuredData.name = productData.name;
    structuredData.description = productData.description || description;
    
    if (productData.image) {
      structuredData.image = productData.image;
    }

    if (productData.price) {
      structuredData.offers = {
        '@type': 'Offer',
        price: productData.price,
        priceCurrency: 'USD',
        availability: `https://schema.org/${productData.availability || 'InStock'}`,
      };
    }

    if (productData.rating || productData.reviews) {
      structuredData.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: productData.rating || 0,
        ratingCount: productData.reviews || 0,
      };
    }
  } else if (articleData) {
    structuredData['@type'] = 'Article';
    structuredData.headline = title;
    structuredData.description = description;
    
    if (articleData.image) {
      structuredData.image = articleData.image;
    }
    if (articleData.author) {
      structuredData.author = {
        '@type': 'Person',
        name: articleData.author,
      };
    }
    if (articleData.publishedDate) {
      structuredData.datePublished = articleData.publishedDate;
    }
    if (articleData.modifiedDate) {
      structuredData.dateModified = articleData.modifiedDate;
    }
  } else {
    structuredData['@type'] = 'WebPage';
    structuredData.name = title;
    structuredData.description = description;
    structuredData.url = canonical || (typeof window !== 'undefined' ? window.location.href : '');
  }

  // Add breadcrumb structured data
  if (breadcrumbs && breadcrumbs.length > 0) {
    structuredData.breadcrumb = {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  // Inject into script tag
  if (typeof document !== 'undefined') {
    let scriptTag = document.querySelector('script[data-seo-head="true"]') as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      scriptTag.setAttribute('data-seo-head', 'true');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);
  }

  return null;
}

export default SEOHead;
