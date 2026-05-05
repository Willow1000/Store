/**
 * SEO Configuration - Centralized settings for SEO and LLM optimization
 * Edit this file to customize SEO parameters for your site
 */

export const SEO_CONFIG = {
  // Site Identity
  site: {
    name: 'MotorVault',
    url: 'https://motorvault.com',
    description: 'Premium automotive parts marketplace. Shop OEM and aftermarket auto parts from trusted sources globally. Quality guaranteed with fast shipping.',
    logo: 'https://motorvault.com/motorvault_horizontal.svg',
    language: 'en',
    locale: 'en_US',
  },

  // Contact Information
  contact: {
    email: 'support@motorvault.com',
    phone: '+1-800-MOTORVAULT',
    address: {
      street: 'Motor Commerce Center',
      city: 'Multiple Locations',
      state: 'USA',
      zipCode: '00000',
      country: 'US',
    },
    operatingRegions: ['United States', 'Switzerland', 'Poland', 'Finland', 'United Arab Emirates'],
    social: {
      facebook: 'https://www.facebook.com/motorvault',
      twitter: 'https://www.twitter.com/motorvault',
      instagram: 'https://www.instagram.com/motorvault',
      linkedin: 'https://www.linkedin.com/company/motorvault',
    },
  },

  // SEO Defaults
  defaults: {
    title: 'MotorVault - Buy Automotive Parts & Accessories | OEM & Aftermarket',
    description: 'Shop thousands of automotive parts and accessories at MotorVault. Quality OEM and aftermarket parts from trusted sources worldwide. Fast shipping, verified sellers, secure checkout.',
    keywords: [
      'automotive parts',
      'car parts',
      'OEM parts',
      'aftermarket parts',
      'auto accessories',
      'buy car parts online',
      'verified sellers',
      'fast shipping',
      'secure checkout',
      'motor parts marketplace',
    ],
    ogImage: 'https://motorvault.com/og-image.png',
    twitterHandle: '@motorvault',
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
      name: 'MotorVault',
      url: 'https://modernmart.manus.space',
      logo: 'https://modernmart.manus.space/motorvault_horizontal.svg',
      description: 'Premium motor products marketplace',
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
