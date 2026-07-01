/**
 * SEO Configuration - Centralized settings for SEO and LLM optimization
 * Edit this file to customize SEO parameters for your site
 */

export const SEO_CONFIG = {
  // Site Identity
  site: {
    name: 'MotorVault',
    url: 'https://motorvault.shop',
    description: 'Rare and hard-to-find European automotive parts marketplace for OEM and aftermarket components with trusted sourcing and fast shipping.',
    logo: '/images/motorvault_horizontal.svg',
    language: 'en',
    locale: 'en_EU',
  },

  // Contact Information
  contact: {
    email: 'support@motorvault.shop',
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
      title: 'Rare European Car Parts | OEM and Aftermarket Auto Parts Europe | MotorVault',
      description: 'Shop rare and hard-to-find European car parts for BMW, Mercedes, Volkswagen, Audi, Porsche, Opel, Fiat, Peugeot, Renault, and Volvo. OEM and aftermarket options with fast shipping in Europe.',
    keywords: [
      'European car parts',
      'rare car parts Europe',
      'hard-to-find auto parts',
      'used car parts Europe',
      'OEM car parts Europe',
      'aftermarket car parts',
      'rare auto parts Europe',
      'discontinued car parts',
      'obsolete auto parts',
      'international car parts shipping',
      'BMW rare parts',
      'Mercedes-Benz rare parts',
      'Volkswagen rare parts',
      'Audi rare parts',
      'Porsche rare parts',
      'Opel rare parts',
      'Fiat rare parts',
      'Peugeot rare parts',
      'Renault rare parts',
      'Volvo rare parts',
      'Alfa Romeo parts',
      'Citroen rare parts',
      'Skoda parts',
      'SEAT parts',
      'Dacia parts',
      'Land Rover parts',
      'Jaguar rare parts',
      'Mini parts',
      'Smart parts',
      'Tesla parts Europe',
      'DPF diesel particulate filter',
      'catalytic converter',
      'ECU engine control unit',
      'turbocharger replacement',
      'gearbox manual transmission',
      'automatic transmission',
      'brake pads discs',
      'suspension shock absorbers',
      'buy rare car parts Europe',
      'order European car parts',
      'cheapest European car parts',
      'best price European auto parts',
      'discount rare car parts',
      'new OEM car parts',
      'reconditioned car parts',
      'genuine European parts',
      'original car parts Europe',
      'car parts Germany',
      'auto parts Europe shipping',
    ],
    ogImage: 'https://motorvault.shop/images/hero/premium-european-auto-parts-hero.webp',
    twitterHandle: '@motorvault',
  },

  // Sitemap Configuration
  sitemap: {
    baseUrl: 'https://motorvault.shop',
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
      url: 'https://motorvault.shop',
      logo: '/images/motorvault_horizontal.svg',
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
      formats: ['avif', 'webp'],
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
