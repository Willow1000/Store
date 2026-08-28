# Crawlability Best Practices (SEO Technical Specification)

## 1. Purpose

This document defines the requirements to ensure a website is fully:

- Discoverable by search engines
- Crawlable by bots (Googlebot, Bingbot, etc.)
- Renderable without missing content
- Indexable without blocking issues
- Structurally optimized for SEO crawling efficiency

---

## 2. Crawlability Overview

Search engines operate in 4 stages:

Discovery → Crawling → Rendering → Indexing

Every stage must be supported explicitly by the site architecture.

## the %off and amount off needs to be correct regardless of the currency being used. if it's 20% off in USD and 50.00 USD off then for euro it should be 20% off and the equivalent euro amount off. the same goes for other currencies. the %off and amount off should be correct for the currency being used.

## 3. Discovery Layer (How bots find your site)

### 3.1 XML Sitemap (Required)

The sitemap is the primary discovery mechanism.

Requirements:

- Must include all indexable URLs
- Must auto-update when content changes
- Must be submitted to Google Search Console

Example:

/
/products/_
/categories/_
/blog/\*

Must NOT include:

- /admin
- /dashboard
- /login
- /checkout
- internal API routes
- duplicate or filtered URLs

---

### 3.2 robots.txt (Critical)

User-agent: \*
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml

Rules:

- Do NOT block CSS or JS files (can break rendering)
- Do NOT block public pages
- Ensure staging environments are blocked if exposed

---

### 3.3 Internal Linking (Crawl Graph)

Search engines crawl via links, not guesses.

Required structure:

Home
├── Categories
│ ├── Product Pages
│ └── Subcategories
└── Blog
├── Articles
└── Related Articles

Rules:

- Every important page must be internally linked
- No orphan pages allowed
- Important pages must be reachable within 2–3 clicks from homepage

---

## 4. Crawling Layer (Can bots read your site?)

### 4.1 Server-Side Rendering (SSR Required)

Content must be available in initial HTML response.

Allowed:

- Django templates
- Next.js SSR / SSG
- Astro static rendering
- Nuxt SSR

Not recommended:

- JS-only rendering of core content
- API-fetched content that loads after page render

---

### 4.2 Semantic HTML Structure

Use meaningful HTML elements:

<header></header> <nav></nav> <main> <article> <section></section> </article> </main> <footer></footer> ```

Avoid:

div-only layouts for entire pages
non-semantic wrappers for main content
4.3 Heading Hierarchy

<h1>Main Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>

Rules:

Only one H1 per page
Logical hierarchy only
No skipping heading levels
4.4 HTTP Status Codes

Correct responses are required:

200 → page exists
301 → permanent redirect
404 → not found

Forbidden:

Returning 200 for missing pages (soft 404s) 5. Indexing Layer (What gets indexed)
5.1 Meta Tags (Required)

Every page must include:

<title>Unique Page Title</title>
<meta name="description" content="Unique page description">
<link rel="canonical" href="https://yourdomain.com/page">

Rules:

No duplicate titles
No empty metadata
Each page must have unique intent
5.2 Robots Meta Tags

<meta name="robots" content="index,follow">

Use noindex for:

admin pages
login pages
checkout pages
internal tools
staging environments
5.3 Canonical URLs

Prevents duplicate content issues:

<link rel="canonical" href="https://yourdomain.com/page">

Required when:

URL parameters exist
multiple URLs serve same content
tracking links are used
5.4 Structured Data (Schema.org)

Required for rich understanding:

Example:

{
"@context": "https://schema.org",
"@type": "Product",
"name": "Product Name",
"description": "Product description",
"offers": {
"@type": "Offer",
"price": "99.99",
"priceCurrency": "USD",
"availability": "https://schema.org/InStock"
}
} 6. Rendering Layer (Google visibility)
6.1 Content in Initial HTML

Required:

Titles
Headings
Main content
Internal links
Structured data

Forbidden:

Critical content loaded only via JS after render
6.2 Lazy Loading Rules

Allowed:

Images
Below-the-fold assets

Forbidden:

Main content
SEO text
Page titles
Structured content
6.3 Preloading Critical Assets

<link rel="preload" as="style" href="/styles.css">
7. URL Structure
7.1 Clean URLs

Good:

/products/nike-air-max
/blog/seo-guide
/categories/shoes

Bad:

/product?id=123
/index.php?page=1
7.2 URL Rules
lowercase only
hyphens only
avoid unnecessary query parameters for core pages 8. Mobile-First Indexing

Requirements:

Fully responsive design
Same content on mobile and desktop
No hidden content differences between devices 9. Performance (Crawl Budget Optimization)

Slow sites are crawled less frequently.

Targets:

LCP < 2.5s
INP < 200ms
CLS < 0.1

Optimizations:

CDN usage
caching headers
compressed images (WebP/AVIF)
minified JS/CSS
server response optimization 10. Pagination & Infinite Scroll

Required:

/products?page=1
/products?page=2

If infinite scroll is used:

Must still expose paginated URLs
Must remain crawlable without JS execution 11. Orphan Pages

Every page must have at least one internal link.

Bad:

Page exists but no inbound links

Good:
Home → Category → Product

12. Image SEO

Requirements:

Descriptive filenames
ALT text on all images

Example:

<img src="nike-air-max.webp" alt="Nike Air Max side view">
13. Breadcrumbs

Recommended structure:

Home > Category > Subcategory > Product

Benefits:

improves crawl understanding
strengthens site hierarchy 14. Duplicate Content Prevention

Avoid multiple URLs serving the same content.

Fix via:

canonical tags
301 redirects
consistent URL structure

Example problem:

/product
/product/
/product?ref=123 15. Security & Trust Signals

Required:

HTTPS everywhere
no mixed content
no redirect loops
consistent domain version (www vs non-www) 16. Internal Linking Rules
Related content must be linked
Category pages must link to children
Blog content should link contextually to relevant pages 17. Crawl Monitoring

Use:

Google Search Console
server logs (Googlebot tracking)
indexing reports

Monitor:

indexed vs submitted pages
crawl errors
blocked resources
soft 404s 18. Non-Negotiable Rules
Site must be SSR or pre-rendered
Sitemap must always be accurate
No orphan pages allowed
No JS-only critical content
Correct HTTP status codes required
No duplicate URL structures without canonicalization
Every page must be reachable via internal links

1. Crawlable structure and navigation
   Logical silo architecture

Create a clear hierarchy:

Home → Categories (e.g. “Brakes”, “Suspension”) → Subcategories → Product pages

Every page should be reachable within ≤ 3–4 clicks from the homepage.

Strong internal linking

Avoid orphan content entirely.

Every product page must be linked from at least one category page
Ideally also linked from contextual pages like:
“compatible with…”
related products
recommendations
Avoid infinite crawl traps

Filters, pagination, sorting, and calendars can generate massive URL explosion.

To control this:

Limit pagination depth where possible
Canonicalize filtered/sorted pages
Use noindex, follow for low-value generated pages
Block unnecessary URL parameters via robots.txt when appropriate 2. Clean URLs and canonicalization
Human-readable URLs

Use stable, descriptive URLs:

Good:

example.com/brakes/front-discs/peugeot-308-2014

Bad:

example.com/?id=4829&session=xyz&sort=price

Remove unnecessary parameters:

sessions
tracking IDs (UTM)
sorting parameters (when not needed for indexing)
Canonical tags (mandatory)

If multiple URLs serve the same content:

<link rel="canonical" href="https://example.com/preferred-url">

This prevents duplicate content issues from:

filters
tracking links
www vs non-www
http vs https
Consistent redirects
Use 301 redirects
Maintain a single canonical version per page
Avoid redirect chains (A → B → C) 3. robots.txt and meta directives
Clean robots.txt

Allow crawling by default:

User-agent: \*
Allow: /

Sitemap: https://example.com/sitemap.xml

Only block:

admin pages
cart/checkout
account areas
unnecessary parameterized URLs
Meta robots usage

Use:

index, follow → normal pages
noindex, follow → utility pages (cart, internal search, confirmations)

Example:

<meta name="robots" content="noindex,follow">
Critical warning

Never block essential assets like:

CSS
JavaScript
images required for rendering

Blocking them prevents proper page rendering in Google.

4. XML sitemaps and submission
   Sitemap requirements
   Always up to date
   Includes only indexable URLs
   Excludes duplicates, filtered pages, and noindex pages
   Structure for large sites

Use multiple sitemaps:

products sitemap
categories sitemap
blog sitemap

Then combine using a sitemap index file.

Search Console submission
Submit sitemap in Google Search Console
Monitor:
indexing errors
crawl anomalies
excluded pages 5. Technical rendering requirements
Server-side rendering (SSR preferred)

Ensure main content is available in HTML before JS executes.

Good:

Django SSR
Next.js SSR/SSG
Nuxt SSR

Risky:

fully client-rendered apps without fallback HTML
HTML structure must be semantic

Use proper structure:

<h1>–<h3> hierarchy
<a href> for links (not JS click handlers only)
semantic tags where possible
JavaScript rendering caution

Google can render JS, but:

it delays indexing
it may miss content
it increases crawl cost

So always ensure core content exists in initial HTML.

6. Performance and crawl efficiency

A slow site reduces crawl budget.

Optimize:

caching (server + CDN)
compressed assets
optimized images (WebP/AVIF)
minimized JS and CSS
fast server response times
Core Web Vitals targets
LCP: < 2.5s
INP: < 200ms
CLS: < 0.1 7. Duplicate content control
Must ensure:
one version per content page
no duplication across filters, tags, or query params
Handling filters and sorting

Example:

/freins?brand=brembo&sort=price

Recommended handling:

canonical → base category page OR
noindex, follow 8. Crawl budget optimization

Google allocates limited crawl resources.

To optimize:

remove low-value pages from indexing
block infinite parameter spaces
reduce duplicate listings
ensure important pages are prioritized in sitemap and internal links 9. International SEO (if applicable)
hreflang implementation

For multilingual sites:

use hreflang tags correctly
avoid duplicate content across languages
map language-country versions properly

Example:

/fr/
/de/
/es/
Currency and localization handling
Keep ONE canonical product URL
Change currency via:
geolocation
user selector
Do NOT create separate URLs per currency 10. Monitoring and maintenance

Regularly audit:

crawl errors (4xx, 5xx)
indexing coverage
orphan pages
sitemap health
robots.txt correctness
canonical correctness

Tools:

Google Search Console
Screaming Frog
Sitebulb
server logs (Googlebot analysis) 11. Quick implementation checklist
Logical site architecture (silos)
No orphan pages
Clean URL structure
Canonical tags implemented
robots.txt correctly configured
XML sitemap submitted and updated
SSR or pre-rendered content
Semantic HTML used
Proper status codes (200/301/404)
Pagination handled safely
Filters controlled (no crawl explosion)
Core Web Vitals optimized
Internal linking structure complete
Duplicate content eliminated
hreflang configured (if multilingual)
