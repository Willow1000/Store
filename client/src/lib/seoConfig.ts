/**
 * SEO Configuration - Centralized settings for SEO and LLM optimization
 * Edit this file to customize SEO parameters for your site
 */

export const SEO_CONFIG = {
  // Site Identity
  site: {
    name: 'ModernMart',
    url: 'https://modernmart.manus.space',
    description: 'Premium e-commerce marketplace with verified sellers and quality products',
    logo: 'https://modernmart.manus.space/logo.png',
    language: 'en',
    locale: 'en_US',
  },

  // Contact Information
  contact: {
    email: 'support@modernmart.manus.space',
    phone: '+1-555-000-0000', // Add real phone
    address: {
      street: '123 Commerce Street', // Update with real address
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'US',
    },
    social: {
      facebook: 'https://www.facebook.com/modernmart',
      twitter: 'https://www.twitter.com/modernmart',
      instagram: 'https://www.instagram.com/modernmart',
      linkedin: 'https://www.linkedin.com/company/modernmart',
    },
  },

  // SEO Defaults
  defaults: {
    title: 'ModernMart - Premium Products from Verified Sellers',
    description: 'Discover thousands of premium products from verified sellers. Quality guaranteed, fast shipping, and secure checkout on every purchase.',
    keywords: [
      'online marketplace',
      'e-commerce',
      'shopping',
      'products',
      'buy online',
      'verified sellers',
      'secure checkout',
      'fast shipping',
    ],
    ogImage: 'https://modernmart.manus.space/og-image.png',
    twitterHandle: '@modernmart',
  },

  // Sitemap Configuration
  sitemap: {
    baseUrl: 'https://modernmart.manus.space',
    maxProductsPerFile: 50000,
    imagesPerUrl: 1000,
    changeFrequencies: {
      homepage: 'daily',
      categoryPages: 'weekly',
      productPages: 'weekly',
      userPages: 'monthly',
    },
    priorities: {
      homepage: 1.0,
      allProducts: 0.95,
      newArrivals: 0.9,
      deals: 0.9,
      trending: 0.85,
      categories: 0.8,
      products: 0.7,
      account: 0.6,
    },
  },

  // Robots.txt Rules
  robots: {
    crawlDelays: {
      googlebot: 0,
      bingbot: 1,
      default: 0,
    },
    allowedLLMs: [
      'GPTBot',
      'CCBot',
      'anthropic-ai',
      'Claude-Web',
    ],
    blockedBots: [
      'MJ12bot',
      'SemrushBot',
      'DotBot',
    ],
    disallowPaths: [
      '/api/',
      '/admin/',
      '/account',
      '/orders',
      '/checkout',
    ],
  },

  // Schema.org Structured Data
  schema: {
    // Organization defaults
    organization: {
      '@type': 'Organization',
      name: 'ModernMart',
      url: 'https://modernmart.manus.space',
      logo: 'https://modernmart.manus.space/logo.png',
      description: 'Premium e-commerce marketplace',
    },
    // LocalBusiness settings
    localBusiness: {
      '@type': 'LocalBusiness',
      areaServed: 'US',
      priceRange: '$0-$10000',
      paymentAccepted: ['Credit Card', 'Debit Card', 'PayPal'],
      availableLanguage: ['en'],
    },
  },

  // Content Guidelines for LLMs
  contentGuidelines: {
    productDescription: {
      minLength: 100,
      maxLength: 5000,
      includeSpecs: true,
      includeFAQ: true,
      includeImages: true,
    },
    categoryDescription: {
      minLength: 50,
      maxLength: 500,
    },
    imageOptimization: {
      formats: ['webp', 'jpg', 'png'],
      maxSize: 1000000, // bytes
      minDimension: 200,
      quality: 85,
    },
  },

  // Search Console & Monitoring
  monitoring: {
    googleAnalytics: process.env.VITE_GA_ID || '',
    googleSearchConsole: 'https://search.google.com/search-console',
    bingWebmasterTools: 'https://www.bing.com/webmasters',
  },

  // Performance Targets
  performance: {
    largestContentfulPaint: 2500, // ms
    firstInputDelay: 100, // ms
    cumulativeLayoutShift: 0.1,
    speedIndex: 3400, // ms
  },

  // Localization
  locales: [
    { code: 'en', name: 'English', default: true },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
  ],

  // Feature Flags
  features: {
    enableBreadcrumbs: true,
    enableStructuredData: true,
    enableDynamicSEOHead: true,
    enableImageSitemap: true,
    enableMobileAnnotations: true,
    enableLLMOptimization: true,
  },
};

/**
 * Get localized SEO config by locale code
 */
export function getSEOConfigByLocale(localeCode: string) {
  const locale = SEO_CONFIG.locales.find(l => l.code === localeCode);
  return {
    ...SEO_CONFIG,
    currentLocale: localeCode,
    localeInfo: locale,
  };
}

/**
 * Generate structured organization data
 */
export function getOrganizationStructuredData() {
  return {
    ...SEO_CONFIG.schema.organization,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: SEO_CONFIG.contact.email,
      availableLanguage: 'en',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: SEO_CONFIG.contact.address.street,
      addressLocality: SEO_CONFIG.contact.address.city,
      addressRegion: SEO_CONFIG.contact.address.state,
      postalCode: SEO_CONFIG.contact.address.zipCode,
      addressCountry: SEO_CONFIG.contact.address.country,
    },
    sameAs: Object.values(SEO_CONFIG.contact.social),
  };
}

/**
 * Get page-specific SEO metadata
 */
export function getPageSEO(pageType: string, customData?: Record<string, any>) {
  const pageConfigs: Record<string, any> = {
    homepage: {
      title: SEO_CONFIG.defaults.title,
      description: SEO_CONFIG.defaults.description,
      priority: SEO_CONFIG.sitemap.priorities.homepage,
      changefreq: 'daily',
    },
    product: {
      title: customData?.name ? `${customData.name} | ${SEO_CONFIG.site.name}` : SEO_CONFIG.defaults.title,
      description: customData?.description || SEO_CONFIG.defaults.description,
      keywords: [...SEO_CONFIG.defaults.keywords, customData?.category],
      priority: SEO_CONFIG.sitemap.priorities.products,
      changefreq: 'weekly',
    },
    category: {
      title: customData?.name ? `${customData.name} | ${SEO_CONFIG.site.name}` : SEO_CONFIG.defaults.title,
      description: customData?.description || SEO_CONFIG.defaults.description,
      priority: SEO_CONFIG.sitemap.priorities.categories,
      changefreq: 'weekly',
    },
  };

  return {
    ...pageConfigs[pageType],
    ...customData,
  };
}

export default SEO_CONFIG;
