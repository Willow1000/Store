import { useEffect } from "react";
import { useHeadCollector } from "@/lib/headManager";
import {
  buildStructuredDataGraph,
  type ArticleSchemaInput,
  type FAQSchemaInput,
  type ProductSchemaInput,
  type SEOPageType,
} from "@/lib/schemaBuilders";

/**
 * Dynamic SEO Head component for per-page meta tags and structured data
 * Use this component in each page to customize SEO meta tags
 */

interface SEOHeadProps {
  pageType?: SEOPageType;
  title?: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  robots?: string;
  ogImage?: string;
  ogType?: "website" | "product" | "article";
  keywords?: string[];
  // For product pages
  productData?: ProductSchemaInput;
  // For article/blog pages
  articleData?: ArticleSchemaInput;
  // For FAQ pages
  faqData?: FAQSchemaInput[];
  // For breadcrumbs
  breadcrumbs?: Array<{
    name: string;
    url: string;
  }>;
}

const SITE_NAME = "MotorVault";
const SUPPORTED_SEO_LANGUAGES = ["en", "de", "it", "fr", "es", "nl"] as const;
const STRUCTURED_DATA_SCRIPT_ID = "mv-structured-data-jsonld";
const STRUCTURED_DATA_SCRIPT_SELECTOR = `script#${STRUCTURED_DATA_SCRIPT_ID}`;
const LANGUAGE_TO_LOCALE: Record<string, string> = {
  en: "en_EU",
  de: "de_DE",
  it: "it_IT",
  fr: "fr_FR",
  es: "es_ES",
  nl: "nl_NL",
};
const DEFAULT_SITE_ORIGIN = (
  import.meta.env.VITE_APP_URL ||
  import.meta.env.VITE_SITE_URL ||
  "https://motorvault.shop"
).replace(/\/$/, "");

function getRuntimeSiteOrigin(): string {
  if (typeof window === "undefined") return DEFAULT_SITE_ORIGIN;

  const currentOrigin = window.location.origin.replace(/\/$/, "");

  try {
    const hostname = new URL(currentOrigin).hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    ) {
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
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    return `${siteOrigin}${path.startsWith("/") ? path : `/${path}`}`;
  } catch {
    const fallbackPath = canonical.startsWith("/")
      ? canonical
      : `/${canonical}`;
    return `${siteOrigin}${fallbackPath}`;
  }
}

function getCurrentUrl(): string {
  return typeof window !== "undefined" ? window.location.href : "";
}

function getDocumentLanguage(): string {
  if (typeof document === "undefined") return "en";
  const raw = (document.documentElement.lang || "en").trim().toLowerCase();
  return raw || "en";
}

function getOgLocaleForLanguage(language: string): string {
  return LANGUAGE_TO_LOCALE[language] || LANGUAGE_TO_LOCALE.en;
}

function toAbsoluteUrl(value?: string, baseUrl?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:")) return undefined;

  try {
    const base = baseUrl || getRuntimeSiteOrigin();
    return new URL(trimmed, base).href;
  } catch {
    return trimmed;
  }
}

function getRobotsContent(
  noIndex?: boolean,
  noFollow?: boolean,
  robots?: string
): string {
  if (robots?.trim()) return robots.trim();

  return [
    noIndex ? "noindex" : "index",
    noFollow ? "nofollow" : "follow",
    "max-image-preview:large",
    "max-snippet:-1",
    "max-video-preview:-1",
  ].join(", ");
}

function escapeHtml(value?: string): string {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHeadMarkup(props: {
  title: string;
  description: string;
  pageUrl: string;
  normalizedOgImage: string;
  ogType: string;
  keywordsContent: string;
  ogLocale: string;
  ogLocaleAlternates: string[];
  robotsContent: string;
  structuredDataJson: string;
}) {
  const {
    title,
    description,
    pageUrl,
    normalizedOgImage,
    ogType,
    keywordsContent,
    ogLocale,
    ogLocaleAlternates,
    robotsContent,
    structuredDataJson,
  } = props;

  const headTags: string[] = [];

  headTags.push(`<title>${escapeHtml(title)}</title>`);
  headTags.push(
    `<meta name="description" content="${escapeHtml(description)}" />`
  );
  headTags.push(
    `<meta name="robots" content="${escapeHtml(robotsContent)}" />`
  );
  if (keywordsContent) {
    headTags.push(
      `<meta name="keywords" content="${escapeHtml(keywordsContent)}" />`
    );
  }
  headTags.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
  headTags.push(
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );
  headTags.push(
    `<meta property="og:image" content="${escapeHtml(normalizedOgImage)}" />`
  );
  headTags.push(`<meta property="og:type" content="${escapeHtml(ogType)}" />`);
  headTags.push(`<meta property="og:url" content="${escapeHtml(pageUrl)}" />`);
  headTags.push(
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`
  );
  headTags.push(
    `<meta property="og:locale" content="${escapeHtml(ogLocale)}" />`
  );
  ogLocaleAlternates.forEach(locale => {
    headTags.push(
      `<meta property="og:locale:alternate" content="${escapeHtml(locale)}" />`
    );
  });
  headTags.push(`<meta name="twitter:card" content="summary_large_image" />`);
  headTags.push(`<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  headTags.push(
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  );
  headTags.push(
    `<meta name="twitter:image" content="${escapeHtml(normalizedOgImage)}" />`
  );

  if (pageUrl) {
    headTags.push(`<link rel="canonical" href="${escapeHtml(pageUrl)}" />`);

    const supportedLanguages = ["en", "de", "it", "fr", "es", "nl"];
    supportedLanguages.forEach(langCode => {
      headTags.push(
        `<link rel="alternate" hreflang="${escapeHtml(langCode)}" href="${escapeHtml(pageUrl)}" />`
      );
    });
    headTags.push(
      `<link rel="alternate" hreflang="x-default" href="${escapeHtml(pageUrl)}" />`
    );
  }

  headTags.push(
    `<meta name="structured-data:format" content="application/ld+json" />`
  );
  headTags.push(`<meta name="structured-data:location" content="head" />`);
  headTags.push(
    `<meta name="structured-data:consumer" content="search-engines,llm-crawlers" />`
  );
  headTags.push(
    `<script id="${STRUCTURED_DATA_SCRIPT_ID}" data-schema="primary" data-schema-purpose="seo-llm" data-seo-head="true" type="application/ld+json">${structuredDataJson}</script>`
  );

  return headTags.join("\n");
}

export function SEOHead({
  pageType = "generic",
  title = "Rare European Car Parts | OEM and Aftermarket Auto Parts Europe | MotorVault",
  description = "Shop rare and hard-to-find European car parts for BMW, Mercedes, Volkswagen, Audi, Porsche, Opel, Fiat, Peugeot, Renault, and Volvo with fast shipping across Europe.",
  canonical,
  noIndex = false,
  noFollow = false,
  robots,
  ogImage = "https://motorvault.shop/images/hero/premium-european-auto-parts-hero.webp",
  ogType = "website",
  keywords = [
    "European car parts",
    "rare car parts Europe",
    "hard-to-find auto parts",
    "OEM car parts Europe",
    "aftermarket car parts",
    "DPF diesel particulate filter",
    "catalytic converter",
    "ECU engine control unit",
    "turbocharger replacement",
    "international car parts shipping",
  ],
  productData,
  articleData,
  faqData,
  breadcrumbs,
}: SEOHeadProps) {
  const effectiveCanonical = normalizeCanonicalUrl(canonical);
  const currentUrl = getCurrentUrl();
  const pageUrl = effectiveCanonical || currentUrl;
  const siteOrigin = getRuntimeSiteOrigin();
  const currentLanguage = getDocumentLanguage();
  const ogLocale = getOgLocaleForLanguage(currentLanguage);
  const ogLocaleAlternates = Object.entries(LANGUAGE_TO_LOCALE)
    .filter(([language]) => language !== currentLanguage)
    .map(([, locale]) => locale);
  const normalizedOgImage = toAbsoluteUrl(ogImage, pageUrl) || ogImage;
  const robotsContent = getRobotsContent(noIndex, noFollow, robots);

  const headCollector = useHeadCollector();

  const inferredPageType: SEOPageType =
    pageType !== "generic"
      ? pageType
      : productData
        ? "product"
        : articleData
          ? "article"
          : faqData && faqData.length > 0
            ? "faq"
            : "generic";

  const structuredData = buildStructuredDataGraph({
    pageType: inferredPageType,
    title,
    description,
    pageUrl,
    siteOrigin,
    language: currentLanguage,
    productData,
    articleData,
    breadcrumbs,
    faqData,
  });
  const structuredDataJson = JSON.stringify(structuredData);
  const keywordsContent = keywords.join(", ");

  const headMarkup = buildHeadMarkup({
    title,
    description,
    pageUrl,
    normalizedOgImage,
    ogType,
    keywordsContent,
    ogLocale,
    ogLocaleAlternates,
    robotsContent,
    structuredDataJson,
  });

  if (typeof window === "undefined" && headCollector) {
    headCollector.addMarkup(headMarkup);
  }

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.title = title;

    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const selector = isProperty
        ? `meta[property="${name}"]`
        : `meta[name="${name}"]`;
      let element = document.querySelector(selector);

      if (!element) {
        element = document.createElement("meta");
        if (isProperty) {
          element.setAttribute("property", name);
        } else {
          element.setAttribute("name", name);
        }
        document.head.appendChild(element);
      }

      element.setAttribute("content", content);
    };

    setMetaTag("description", description);
    setMetaTag("robots", robotsContent);
    if (keywordsContent) {
      setMetaTag("keywords", keywordsContent);
    }

    setMetaTag("og:title", title, true);
    setMetaTag("og:description", description, true);
    setMetaTag("og:image", normalizedOgImage, true);
    setMetaTag("og:type", ogType, true);
    setMetaTag("og:url", pageUrl, true);
    setMetaTag("og:site_name", SITE_NAME, true);
    setMetaTag("og:locale", ogLocale, true);

    document
      .querySelectorAll('meta[property="og:locale:alternate"]')
      .forEach(el => el.remove());
    ogLocaleAlternates.forEach(locale => {
      const altLocale = document.createElement("meta");
      altLocale.setAttribute("property", "og:locale:alternate");
      altLocale.setAttribute("content", locale);
      document.head.appendChild(altLocale);
    });

    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", title);
    setMetaTag("twitter:description", description);
    setMetaTag("twitter:image", normalizedOgImage);

    if (pageUrl) {
      let canonicalLink = document.querySelector(
        'link[rel="canonical"]'
      ) as HTMLLinkElement;
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.rel = "canonical";
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = pageUrl;

      document
        .querySelectorAll('link[rel="alternate"][hreflang]')
        .forEach(el => el.remove());
      SUPPORTED_SEO_LANGUAGES.forEach(langCode => {
        const alt = document.createElement("link");
        alt.rel = "alternate";
        alt.hreflang = langCode;
        alt.href = pageUrl;
        document.head.appendChild(alt);
      });
      const defaultAlt = document.createElement("link");
      defaultAlt.rel = "alternate";
      defaultAlt.hreflang = "x-default";
      defaultAlt.href = pageUrl;
      document.head.appendChild(defaultAlt);
    }

    let scriptTag = document.querySelector(
      STRUCTURED_DATA_SCRIPT_SELECTOR
    ) as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.querySelector(
        'script[data-seo-head="true"]'
      ) as HTMLScriptElement;
    }
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = STRUCTURED_DATA_SCRIPT_ID;
      scriptTag.type = "application/ld+json";
      scriptTag.setAttribute("data-seo-head", "true");
      scriptTag.setAttribute("data-schema", "primary");
      scriptTag.setAttribute("data-schema-purpose", "seo-llm");
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = structuredDataJson;
  }, [
    description,
    keywordsContent,
    normalizedOgImage,
    ogType,
    ogLocale,
    ogLocaleAlternates,
    pageUrl,
    robotsContent,
    structuredDataJson,
    title,
  ]);

  return null;
}

export default SEOHead;
