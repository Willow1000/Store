# 1. Executive Summary

This document defines a production-grade schema markup architecture for an auto parts ecommerce website. The goal is to make product, category, brand, policy, and support content machine-readable for Google Search, rich result systems, and LLM-driven discovery systems.

All critical schema must be present in the initial HTML response. This is non-negotiable. Search engine crawlers, shopping crawlers, and LLM crawlers may not execute full client-side JavaScript reliably. If schema is only injected after hydration, key product signals can be missed, delayed, or ignored.

The implementation standard in this document is JSON-LD rendered server-side or statically at build time, with strict data parity between visible page content and schema values.

# 2. Objectives

- Improve search engine understanding of product entities, category structure, merchant identity, and content intent.
- Increase eligibility for rich results by supplying valid, complete, and consistent structured data.
- Improve AI and LLM readability by exposing normalized machine-readable facts in initial HTML.
- Establish a modular schema system that scales across all template types and product catalog growth.
- Prevent schema drift by tying schema output directly to canonical content sources.

# 3. Schema Strategy Overview

The schema system should be centralized and template-driven.

- A single schema builder layer should generate JSON-LD for all page types.
- Page templates should request schema objects from that layer using typed input models.
- Serialization should happen once, server-side, and emit deterministic script blocks in initial HTML.
- Each template should support a clear schema stack. Example: Product page uses Product + BreadcrumbList + Organization reference.
- Shared entities should be generated from one source. Organization identity should not vary per page.

Why JSON-LD:

- Supported by Google and broadly preferred over microdata/RDFa for maintainability.
- Keeps schema logic separate from HTML markup complexity.
- Easier to test, version, lint, and diff in CI.

Future support:

- Add new page-type builders without changing existing builders.
- Extend with ItemList, Vehicle-specific attributes, HowTo, or VideoObject only when content supports them.
- Use schema versioning in code to avoid breaking historical templates.

# 4. Crawlability and LLM Accessibility Requirements

- All schema scripts must be embedded in initial HTML response.
- Critical schema must not depend on post-load script injection, tag managers, or client-only rendering.
- Schema must be available when checking raw page source.
- Schema values must match visible content exactly for title, price, stock, rating, and policy statements.
- Product facts should be available in both readable HTML and JSON-LD.
- Pages must remain semantically understandable if JavaScript fails.
- Canonical URL, product URL, and schema URL fields must align.
- Image URLs in schema must resolve with HTTP 200 and be crawlable.

# 5. Site-Wide Schema Types

## Organization

- Use on all indexable templates.
- Include legal brand name, logo, URL, contact points when publicly visible, and sameAs links for official profiles.
- Keep one canonical organization identity source.

## WebSite

- Use on homepage and optionally all major templates.
- Include site name, URL, and SearchAction only if on-site search exists and is publicly accessible.

## BreadcrumbList

- Use on category, product, article, policy, and support pages where breadcrumb navigation is visible.
- Must reflect actual clickable breadcrumb path shown to users.

## SearchAction

- Include under WebSite when search endpoint is stable and returns relevant results.
- Do not include if search is blocked, unstable, or not publicly usable.

## sameAs Links

- Include only verified, official brand profiles.
- Do not include placeholders or social URLs not controlled by the business.

# 6. Page-Type Schema Mapping

## Homepage

- Use WebSite, Organization, and optionally ItemList for featured categories if visible.
- Purpose: establish site identity and discovery entry point.

## Category Pages

- Use BreadcrumbList and ItemList with links to visible products.
- Purpose: expose listing semantics and category hierarchy.

## Product Pages

- Use Product with nested Offer and optional AggregateRating/Review when real and visible.
- Include BreadcrumbList.
- Purpose: maximize product understanding and rich result eligibility.

## Blog or Article Pages

- Use Article or BlogPosting with author, datePublished, dateModified, headline, image.
- Include BreadcrumbList.

## FAQ Pages

- Use FAQPage only when FAQ content is visible on page and matches schema question-answer pairs.

## Contact Page

- Use ContactPage and Organization reference.
- Include address/contact details only if visible publicly.

## About Page

- Use AboutPage and Organization.
- Include brand narrative and business identity fields that match visible content.

## Policy Pages

- Use WebPage plus BreadcrumbList.
- Add policy-specific structured fields only when content maps to supported schema types.

# 7. Product Page Schema Specification

## Required Product Fields

- name
- description
- image
- brand
- offers
- offers.priceCurrency
- offers.price
- offers.availability
- offers.url
- url

## Recommended Fields

- sku
- mpn or gtin where available
- itemCondition
- category
- additionalProperty for genuine visible specs like engine code, part position, OEM number
- shippingDetails in Offer when shipping terms are visible
- hasMerchantReturnPolicy in Offer when return policy is visible

## Optional Fields

- aggregateRating when rating is genuine and displayed to users
- review when review content is genuine and displayed
- color, material, compatible vehicle info where visible and useful

## Never Fabricate

- Ratings, reviews, stock status, price, SKU, GTIN, MPN, shipping cost, return windows, condition.
- Never output placeholders like N/A or dummy values.

## Variants

- If each variant has a unique URL and purchasable state, render Product per URL with variant-specific Offer.
- If variants are selectable on one URL, render parent Product with representative details and variant-specific offers only when clear and accurate.
- Keep visible selected variant data synchronized with schema for that rendered URL.

## Out-of-Stock Handling

- Use https://schema.org/OutOfStock when unavailable.
- Keep product page indexable if restock is expected.
- Do not remove price unless page also hides price visibly.

## Price and Inventory Sync

- Schema must pull from the same pricing and stock source used by page rendering.
- No secondary stale cache for schema alone.
- Any product update should update page HTML and schema atomically for next response.

# 8. Field Mapping Table

| Website Data Source                          | Schema Property               | Required or Optional | Notes                                         | Validation Rule                                        |
| -------------------------------------------- | ----------------------------- | -------------------- | --------------------------------------------- | ------------------------------------------------------ |
| products.title or products.name              | Product.name                  | Required             | Must match visible product title              | Non-empty, trimmed, equals H1 or primary product title |
| products.description or normalized specifics | Product.description           | Required             | Keep plain text and user-visible facts only   | Min length > 20 chars, no hidden claims                |
| products.cover_image_url or gallery[0]       | Product.image                 | Required             | Prefer absolute HTTPS URL                     | Returns 200, crawlable, valid image MIME               |
| products.sku                                 | Product.sku                   | Recommended          | Unique merchant SKU when available            | Alphanumeric format, stable per item                   |
| products.brand                               | Product.brand.name            | Required             | Must be visible brand                         | Non-empty; fallback to merchant brand only when true   |
| products.price                               | Offer.price                   | Required             | Exact price shown on page                     | Numeric string with decimal normalization              |
| currency context                             | Offer.priceCurrency           | Required             | ISO 4217 code                                 | Must be one of supported site currencies               |
| products.stock                               | Offer.availability            | Required             | InStock or OutOfStock mapping                 | Reflects real stock state                              |
| canonical product URL                        | Product.url / Offer.url       | Required             | Must be canonical                             | Absolute URL; matches rel=canonical                    |
| products.gtin                                | Product.gtin                  | Optional             | Only when validated                           | Length and checksum validity where possible            |
| products.mpn                                 | Product.mpn                   | Recommended          | Manufacturer part number                      | Do not duplicate fake identifiers                      |
| calculated shipping policy                   | Offer.shippingDetails         | Optional             | Include only if visible policy exists         | Values must match visible shipping text                |
| visible return policy                        | Offer.hasMerchantReturnPolicy | Optional             | Include only if policy visible and applicable | Values must match policy page                          |
| visible ratings summary                      | Product.aggregateRating       | Optional             | Only with genuine reviews                     | ratingValue and reviewCount must match UI              |
| visible review entries                       | Product.review                | Optional             | Only real reviews shown on page               | Reviewer/date/body visible to users                    |

# 9. JSON-LD Examples

## Organization

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://motorvault.shop/#organization",
  "name": "MotorVault",
  "url": "https://motorvault.shop",
  "logo": "https://motorvault.shop/images/logo.png",
  "sameAs": [
    "https://www.facebook.com/motorvault",
    "https://www.instagram.com/motorvault"
  ]
}
```

## WebSite With SearchAction

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://motorvault.shop/#website",
  "url": "https://motorvault.shop",
  "name": "MotorVault",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://motorvault.shop/products?query={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

## BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://motorvault.shop/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "BMW Parts",
      "item": "https://motorvault.shop/products?brand=bmw"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "BMW E90 DPF Filter",
      "item": "https://motorvault.shop/product/bmw-e90-dpf-18307806473"
    }
  ]
}
```

## Product With Offer

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": "https://motorvault.shop/product/bmw-e90-dpf-18307806473#product",
  "name": "BMW E90 320d Diesel Particulate Filter (DPF)",
  "description": "OEM-fit diesel particulate filter for BMW E90 320d. Compatible with listed engine codes and model years shown on page.",
  "image": [
    "https://motorvault.shop/images/products/bmw-e90-dpf-front.jpg",
    "https://motorvault.shop/images/products/bmw-e90-dpf-side.jpg"
  ],
  "sku": "BMW-E90-DPF-18307806473",
  "mpn": "18307806473",
  "brand": {
    "@type": "Brand",
    "name": "BMW"
  },
  "url": "https://motorvault.shop/product/bmw-e90-dpf-18307806473",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "USD",
    "price": "649.00",
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/UsedCondition",
    "url": "https://motorvault.shop/product/bmw-e90-dpf-18307806473",
    "shippingDetails": {
      "@type": "OfferShippingDetails",
      "shippingDestination": {
        "@type": "DefinedRegion",
        "addressCountry": "US"
      },
      "shippingRate": {
        "@type": "MonetaryAmount",
        "value": "25.00",
        "currency": "USD"
      }
    },
    "hasMerchantReturnPolicy": {
      "@type": "MerchantReturnPolicy",
      "applicableCountry": "US",
      "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
      "merchantReturnDays": 30,
      "returnMethod": "https://schema.org/ReturnByMail"
    }
  }
}
```

## Article or BlogPosting

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://motorvault.shop/blog/how-to-identify-oem-part-numbers#article",
  "headline": "How To Identify OEM Part Numbers For European Vehicles",
  "description": "Step-by-step guide to identifying OEM part numbers for BMW, Mercedes, Audi, and VW models.",
  "image": "https://motorvault.shop/images/blog/oem-part-number-guide.jpg",
  "datePublished": "2026-06-12T09:00:00+00:00",
  "dateModified": "2026-06-12T09:00:00+00:00",
  "author": {
    "@type": "Person",
    "name": "MotorVault Technical Team"
  },
  "publisher": {
    "@type": "Organization",
    "@id": "https://motorvault.shop/#organization"
  },
  "mainEntityOfPage": "https://motorvault.shop/blog/how-to-identify-oem-part-numbers"
}
```

# 10. Implementation Architecture

Use a centralized schema module with typed builders.

- Create a shared schema library with one builder per page type.
- Keep JSON-LD generation server-side in SSR response pipeline.
- For static pages, generate JSON-LD during build and embed in HTML output.
- For product pages, map directly from canonical product data model used to render page content.
- Create a safe serializer that strips undefined fields and prevents invalid empty arrays.
- Emit one script per logical entity block or one consolidated graph, consistently.

Suggested module structure:

- schema/core.ts for base helpers like URL normalization and safe serialization.
- schema/builders/organization.ts for Organization and WebSite.
- schema/builders/product.ts for Product and Offer.
- schema/builders/breadcrumb.ts for BreadcrumbList.
- schema/builders/article.ts for BlogPosting.
- schema/render.ts for injecting script tags into initial HTML.

Missing data handling:

- Omit optional fields if unavailable.
- Never fill with fake or placeholder values.
- Fail validation in CI for missing required fields on eligible templates.

Auto-update behavior:

- Schema must be derived from same DB/CMS object as visible page.
- Any product update should invalidate SSR/static cache for that product URL.
- Revalidation events should refresh both content and schema simultaneously.

# 11. Validation and QA

- Validate template outputs in Google Rich Results Test for representative URLs.
- Validate all schema syntax with Schema Markup Validator.
- Run view-source checks to confirm JSON-LD exists in initial HTML.
- Verify content parity manually for title, price, stock, review counts, policy claims.
- Use URL Inspection in Search Console for rendered and crawled structured data confirmation.
- Test staging URLs before production rollout.
- Add regression tests that snapshot JSON-LD output by template and key entity fields.
- Add integration checks for broken image URLs, invalid canonical URLs, and malformed currency codes.

# 12. Deployment Plan

1. Audit all templates and classify by page type.
2. Implement Organization, WebSite, and BreadcrumbList globally.
3. Implement Product schema on top-revenue product templates first.
4. Validate in staging using sample URLs across brands and stock states.
5. Roll out in phases by template group and monitor errors.
6. Monitor Search Console enhancement reports and fix issues quickly.
7. Expand coverage to full catalog, blog, FAQ, and support templates.
8. Re-validate after each template release.

# 13. Maintenance and Ownership

- SEO lead owns schema requirements and acceptance criteria.
- Engineering owns builder implementation, tests, and release safety.
- Content and merchandising teams own source data quality for product fields.
- Audit cadence should be monthly for syntax and parity, weekly for high-value product pages.
- Version-control schema builders and mapping rules in git with PR review.
- Include schema checks in CI to prevent schema drift.
- Track incidents when visible content and schema diverge, then patch source mapping.

# 14. Common Mistakes To Avoid

- Injecting schema only after client-side hydration.
- Marking up content not visible to users.
- Using wrong schema types for page intent.
- Publishing duplicate conflicting Product blocks for one URL.
- Leaving stale price or stock in schema after catalog updates.
- Emitting fake ratings or fabricated reviews.
- Using broken image URLs or non-canonical URLs in schema.
- Including SearchAction when search endpoint is not reliable.
- Adding optional fields with invalid placeholders.

# 15. Recommended Production Standard

Default schema stack:

- All indexable pages: Organization reference, WebPage context, and BreadcrumbList when applicable.
- Homepage: Organization + WebSite + optional SearchAction.
- Category pages: BreadcrumbList + ItemList of visible products.
- Product pages: Product + Offer plus optional AggregateRating, Review, shippingDetails, return policy when visible and genuine.
- Content pages: BlogPosting or Article where relevant.
- FAQ pages: FAQPage only for visible FAQ content.

Generation standard:

- JSON-LD only.
- Server-side or static generation only for critical schema.
- Initial HTML response must contain all critical schema scripts.
- Data must be sourced from canonical content models and validated pre-release.

Future-proofing standard:

- Keep builders modular and typed.
- Enforce schema tests in CI.
- Monitor Search Console and structured data validators continuously.
- Treat schema as production application code, not a one-time SEO task.
