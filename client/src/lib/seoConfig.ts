/**
 * SEO Configuration - Centralized settings for SEO and LLM optimization
 * Edit this file to customize SEO parameters for your site
 */

export const SEO_CONFIG = {
  // Site Identity
  site: {
    name: "MotorVault",
    url: "https://motorvault.shop",
    description:
      "Online auto parts and accessories store: truck, Jeep and Tesla accessories, lighting, towing and car care, plus OEM and used parts for European makes such as Opel, BMW, Audi and Fiat.",
    logo: "/images/motorvault_horizontal.svg",
    language: "en",
    locale: "en_EU",
  },

  // Contact Information
  contact: {
    email: "support@motorvault.shop",
    // Published in the Organization structured data on every page; it is the
    // store's WhatsApp number (same as the Contact page's WhatsApp link).
    phone: "+1-443-554-0384",
    // The address the Contact page's map and the FAQ already publish.
    // OWNER TO CONFIRM, and add the postal code and legal entity name.
    address: {
      street: "Nijverheidsweg 27",
      city: "Heinenoord",
      state: "",
      zipCode: "",
      country: "NL",
    },
    operatingRegions: [
      "United States",
      "Switzerland",
      "Poland",
      "Finland",
      "United Arab Emirates",
    ],
    // Only real, owner-confirmed profile URLs belong here: they feed the
    // Organization `sameAs` structured data and the footer. Empty entries are
    // skipped everywhere. The Facebook URL is the one the Contact page links.
    social: {
      facebook: "https://www.facebook.com/profile.php?id=61590090897198",
      twitter: "",
      instagram: "",
      linkedin: "",
    } as Record<string, string>,
  },

  // SEO Defaults
  defaults: {
    title:
      "Auto Parts & Accessories for Trucks, Jeeps, Teslas & European Cars | MotorVault",
    description:
      "Shop accessories and parts for the Ford F-150, Ram 1500, Chevy Silverado, Toyota Tacoma, Jeep Wrangler and Tesla Model 3 and Y, plus OEM and used parts for Opel, BMW, Audi and Fiat.",
    keywords: [
      "auto parts online",
      "truck accessories",
      "Ford F-150 accessories",
      "Ram 1500 accessories",
      "Chevy Silverado accessories",
      "Toyota Tacoma accessories",
      "Jeep Wrangler accessories",
      "Tesla Model Y accessories",
      "Tesla Model 3 accessories",
      "tonneau covers",
      "leveling kits",
      "LED lighting",
      "towing gear",
      "car care products",
      "OEM car parts",
      "aftermarket car parts",
      "used car parts",
      "Opel parts",
      "BMW parts",
      "Audi parts",
      "Fiat parts",
      "VIN decoder",
    ],
    ogImage:
      "https://motorvault.shop/images/hero/premium-european-auto-parts-hero.webp",
    twitterHandle: "@motorvault",
  },

  // Sitemap Configuration
  sitemap: {
    baseUrl: "https://motorvault.shop",
    maxProductsPerFile: 50000,
    imagesPerUrl: 1000,
    changeFrequencies: {
      homepage: "daily",
      categoryPages: "weekly",
      productPages: "weekly",
      userPages: "monthly",
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
    allowedLLMs: ["GPTBot", "CCBot", "anthropic-ai", "Claude-Web"],
    blockedBots: ["MJ12bot", "SemrushBot", "DotBot"],
    disallowPaths: ["/api/", "/admin/", "/account", "/orders", "/checkout"],
  },

  // Schema.org Structured Data
  schema: {
    // Organization defaults
    organization: {
      "@type": "Organization",
      name: "MotorVault",
      url: "https://motorvault.shop",
      logo: "/images/motorvault_horizontal.svg",
      description: "Premium motor products marketplace",
    },
    // LocalBusiness settings
    localBusiness: {
      "@type": "LocalBusiness",
      areaServed: "US",
      priceRange: "$0-$10000",
      paymentAccepted: ["Credit Card", "Debit Card", "PayPal"],
      availableLanguage: ["en"],
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
      formats: ["avif", "webp"],
      maxSize: 1000000, // bytes
      minDimension: 200,
      quality: 85,
    },
  },

  // Search Console & Monitoring
  monitoring: {
    googleAnalytics: import.meta.env.VITE_GA_ID || "",
    googleSearchConsole: "https://search.google.com/search-console",
    bingWebmasterTools: "https://www.bing.com/webmasters",
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
    { code: "en", name: "English", default: true },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
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
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: SEO_CONFIG.contact.email,
      availableLanguage: "en",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: SEO_CONFIG.contact.address.street,
      addressLocality: SEO_CONFIG.contact.address.city,
      addressRegion: SEO_CONFIG.contact.address.state,
      postalCode: SEO_CONFIG.contact.address.zipCode,
      addressCountry: SEO_CONFIG.contact.address.country,
    },
    sameAs: Object.values(SEO_CONFIG.contact.social).filter(Boolean),
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
      changefreq: "daily",
    },
    product: {
      title: customData?.name
        ? `${customData.name} | ${SEO_CONFIG.site.name}`
        : SEO_CONFIG.defaults.title,
      description: customData?.description || SEO_CONFIG.defaults.description,
      keywords: [...SEO_CONFIG.defaults.keywords, customData?.category],
      priority: SEO_CONFIG.sitemap.priorities.products,
      changefreq: "weekly",
    },
    category: {
      title: customData?.name
        ? `${customData.name} | ${SEO_CONFIG.site.name}`
        : SEO_CONFIG.defaults.title,
      description: customData?.description || SEO_CONFIG.defaults.description,
      priority: SEO_CONFIG.sitemap.priorities.categories,
      changefreq: "weekly",
    },
  };

  return {
    ...pageConfigs[pageType],
    ...customData,
  };
}

export default SEO_CONFIG;
