# MotorVault Engineering Remediation & Optimization Specification

## Project Objective

Resolve authentication-related bugs, improve platform performance, address accessibility issues, optimize feed generation, improve reliability, and strengthen security while preserving critical business flows.

---

# Critical Non-Negotiable Constraints

## Authentication

### DO NOT ALTER AUTH FLOW

The following systems must remain architecturally unchanged:

* Login
* Registration
* Password Reset
* Session Management
* JWT Handling
* OAuth Integrations
* Existing Authentication Middleware
* Existing Protected Route Logic

Only fix reported bugs.

No auth redesigns.

No auth rewrites.

No auth provider migrations.

---

## Checkout

### DO NOT ALTER PAYSTACK CHECKOUT

Protected systems:

* Checkout Flow
* Payment Initialization
* Payment Verification
* Payment Webhooks
* Order Completion
* Order Status Updates

No changes may impact:

* Successful payments
* Payment verification
* Order processing

---

# Phase 1 – Critical Functional Fixes

## 1. Ticket Access Authentication Bug

### Problem

Authenticated users are shown:

```text
Sign in to access your tickets
```

even after successfully logging in.
For all images that are stored in this codebase, use the .avif format if available if not use the .webp format. The images need to be optimized for faster loading times. delete the .png, .jpg, and .jpeg formats. The images need to be optimized for faster loading times.Also, rename the images to be use seo keywords, same to the alt text of the images and meta description of the images. The images need to be optimized for faster loading times. and metadata optimize everything for seo and performance while maintaining the quality of the images and content on the website, use the webp format as fallback if the .avif format is not available
### Required Outcome

Authenticated users must:

* Access tickets immediately
* Retain session after refresh
* Access protected routes correctly
* Never receive false login prompts

### Tasks

#### Frontend

* Audit auth state hydration
* Audit auth context initialization
* Verify token refresh handling
* Verify protected route handling
* Verify session restoration on reload

#### Backend

* Verify session validation endpoint
* Verify JWT validation logic
* Verify cookie/session handling
* Verify authorization middleware

### Acceptance Criteria

* User logs in
* User accesses tickets
* Tickets load successfully
* No sign-in prompt appears
* Refreshing page retains access

---

## 2. Contact Form Authentication Bug

### Problem

Endpoint returns:

```text
POST /api/contact-us 401 Unauthorized
invalid session token
```

### Required Behavior

Contact form must be publicly accessible.

Supported users:

* Anonymous visitors
* Registered users
* Logged-in users

### Backend Requirements

Remove authentication requirements from:

```http
POST /api/contact-us
```

Remove:

* JWT validation
* Session validation
* Auth middleware

### Validation

Required fields:

```json
{
  "name": "",
  "email": "",
  "subject": "",
  "message": ""
}
```

### Spam Protection

Implement at least one:

* Honeypot
* Rate Limiting
* Turnstile
* reCAPTCHA

### Response Format

Success:

```json
{
  "success": true
}
```

Failure:

```json
{
  "success": false,
  "error": "Validation error"
}
```

### Acceptance Criteria

* Anonymous users can submit
* Authenticated users can submit
* No auth errors occur
* Submission persists successfully

---

# Phase 2 – Feed XML Enhancements

## Base URL

Use:

```text
https://motorvault.shop
```

for all feed URLs.

---

## Shipping Attribute

Every product must include shipping information.

Example:

```xml
<g:shipping>
  <g:country>KE</g:country>
  <g:service>Standard</g:service>
  <g:price>500 KES</g:price>
</g:shipping>
```

---

## Dynamic Shipping Cost Calculation

Shipping cost must vary according to product price.

Suggested pricing model:

| Product Price | Shipping Cost |
| ------------- | ------------- |
| $0–50         | $5            |
| $50–150       | $10           |
| $150–500      | $20           |
| $500+         | Free          |

Implementation requirements:

* Centralized shipping calculator
* No duplicated logic
* Easily configurable

Example:

```ts
calculateShipping(productPrice)
```

---

## Feed Localization

### Endpoint

```text
/feed.xml
```

### Language Support

Examples:

```text
/feed.xml?lang=ESP
/feed.xml?lang=FRA
/feed.xml?lang=GER
```

Supported languages:

* ENG
* ESP
* FRA
* GER
* ITA

Default:

```text
ENG
```

when missing.

---

When sending automated emails, I want the emails to be in the User's language
## Currency Support

Examples:

```text
/feed.xml?curr=EUR
/feed.xml?curr=GBP
/feed.xml?curr=KES
```

Supported currencies:

* USD
* EUR
* GBP
* KES

Default:

```text
USD
```

when missing.

---

## Combined Localization

Example:

```text
/feed.xml?lang=ESP&curr=EUR
```

Returns:

* Spanish content
* EUR pricing

---

## Localization Rules

| Parameter   | Result                                |
| ----------- | ------------------------------------- |
| None        | English + USD                         |
| lang only   | Selected language + USD               |
| curr only   | English + Selected currency           |
| lang + curr | Selected language + Selected currency |

---

## Feed Compatibility

Generated feed must remain compatible with:

* Google Merchant Center
* Facebook Catalog
* TikTok Catalog
* Pinterest Catalog

Feed validation required before deployment.

---

# Phase 3 – Logout Cleanup

## Requirement

On logout execute:

```js
localStorage.clear();
sessionStorage.clear();
```

### Acceptance Criteria

After logout:

* No auth state remains
* No stale cache remains
* No stale user data remains
* No stale preferences remain

---

# Phase 4 – Protected Page Skeleton Loading Bug

## Problem

When users:

1. Open a protected page
2. Switch browser tabs
3. Return later

Protected content remains stuck loading.

Only a manual refresh fixes it.

---

## Root Cause Focus

Do NOT rewrite authentication.

Investigate:

* React Query cache
* SWR cache
* Session revalidation
* Visibility state handling
* Focus state handling

---

## Required Behavior

Protected pages must automatically revalidate when users return.

Trigger revalidation on:

```text
visibilitychange
focus
pageshow
```

---

## React Query

Enable:

```ts
refetchOnWindowFocus: true
```

where appropriate.

---

## SWR

Enable:

```ts
revalidateOnFocus: true
```

where appropriate.

---

## Manual Fallback

```ts
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refreshSession();
    refetchProtectedData();
  }
});
```

---

## Acceptance Criteria

* User leaves tab
* User returns
* Session revalidated automatically
* Data reloads automatically
* Skeleton disappears automatically
* No manual refresh required

---

# Phase 5 – Performance Optimization

## Target Lighthouse Scores

### Desktop

| Metric         | Target |
| -------------- | ------ |
| Performance    | 90+    |
| Accessibility  | 95+    |
| Best Practices | 95+    |
| SEO            | 100    |

### Mobile

| Metric         | Target |
| -------------- | ------ |
| Performance    | 90+    |
| Accessibility  | 95+    |
| Best Practices | 95+    |
| SEO            | 100    |

---

## Image Optimization

Convert:

* JPG
* JPEG
* PNG

to:

* AVIF
* WebP fallback

Implement:

```html
<picture>
  <source type="image/avif">
  <source type="image/webp">
  <img>
</picture>
```

Use:

* srcset
* sizes

### Compression Targets

Hero Images:

```text
<250KB
```

Banner Images:

```text
<150KB
```

Thumbnails:

```text
<50KB
```

---

## LCP Optimization

Target:

```text
LCP < 2.5s
```

### Requirements

Hero image:

```html
fetchpriority="high"
loading="eager"
```

Preload hero asset:

```html
<link rel="preload">
```

Remove oversized assets.

---

## JavaScript Optimization

Current bundle is oversized.

### Tasks

Implement:

```tsx
React.lazy()
Suspense
```

for:

* Dashboard
* Admin
* Product pages
* Account pages

### Dynamic Imports

Load only when needed:

* Analytics
* Recommendations
* Currency services

### Tree Shaking

Remove:

* Dead code
* Unused utilities
* Unused libraries

---

## CSS & Font Optimization

Inline:

```css
critical CSS
```

Defer:

```css
non-critical CSS
```

Use:

```css
font-display: swap;
```

---

## Third-Party Optimization

### Currency API

Cache exchange rates.

Refresh:

```text
Every 6–12 hours
```

### Images

Proxy and optimize external product images.

### Facebook Pixel

Load only after consent or interaction.

---

# Phase 6 – Accessibility

## Mobile Menu

Add:

```html
aria-label="Open menu"
```

---

## Cart Link

Add:

```html
aria-label="Shopping cart"
```

---

## Viewport

Replace:

```html
maximum-scale=1
```

with:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

---

## Heading Hierarchy

Maintain:

```text
h1 → h2 → h3 → h4
```

without skipping levels.

---

## Touch Targets

Minimum:

```text
44px × 44px
```

---

# Phase 7 – Infrastructure & Reliability

## Supabase Realtime

Investigate:

* Project URL
* DNS
* Environment Variables
* Realtime Configuration

Disable realtime if unused.

---

## Deprecated APIs

Replace:

```js
window.unload
```

with:

```js
pagehide
visibilitychange
```

---

## Source Maps

Generate production source maps.

Benefits:

* Better debugging
* Better monitoring
* Better Lighthouse diagnostics

---

# Phase 8 – Security Hardening

## Required Security Headers

```http
Content-Security-Policy
Strict-Transport-Security
X-Frame-Options
Cross-Origin-Opener-Policy
```

---

## Trusted Types

Protect against:

```text
DOM XSS
```

---

## Secure Cookies

Use:

```http
Secure
HttpOnly
SameSite=Lax
```

or stricter.

---

# Phase 9 – AI Readiness

## llms.txt

Create valid implementation.

Example structure:

```text
# MotorVault

## About
MotorVault is a marketplace for automotive parts.

## Important URLs
/products
/categories
/contact
/shipping
/returns

## AI Crawling Policy

Allowed:
- Product pages
- Categories

Disallowed:
- Checkout
- Dashboards
- Admin
```

---

# Definition of Done

## Functional

* Ticket access works
* Contact form works publicly
* Protected pages recover after tab switching
* Logout clears all browser storage

## Feed

* Shipping included
* Localization supported
* Currency conversion supported
* Feed validates successfully

## Performance

Desktop Lighthouse:

```text
90+
```

Mobile Lighthouse:

```text
90+
```

LCP:

```text
<2.5s
```

FCP:

```text
<1.8s
```

## Accessibility

```text
95+
```

No accessibility violations remain.

## Reliability

* No console errors
* No stale protected-page loading states
* No Supabase realtime failures

## Security

* CSP configured
* HSTS configured
* Trusted Types configured
* Secure cookies configured

## AI Readiness

* Valid llms.txt
* AI crawler compatibility passes
* Merchant feed validation passes
* Localization support operational

```
```

# Phase 2 — Performance Optimization (Critical)

---

## Current Lighthouse Scores

### Desktop

| Metric         | Current |
| -------------- | ------- |
| Performance    | 55      |
| Accessibility  | 93      |
| Best Practices | 77      |
| SEO            | 100     |

### Mobile

| Metric         | Current |
| -------------- | ------- |
| Performance    | 53      |
| Accessibility  | 80      |
| Best Practices | 77      |
| SEO            | 100     |

### Target Scores

| Metric         | Target       |
| -------------- | ------------ |
| Performance    | 90+          |
| Accessibility  | 95+          |
| Best Practices | 95+          |
| SEO            | Maintain 100 |

---

# 3. Image Optimization (Highest Impact)

## Problem

Hero images are excessively large.

Examples:

```text
3.5 MB
3.1 MB
3.1 MB
```

Current dimensions:

```text
2752 x 1235
```

These images are significantly larger than required and are the primary cause of poor LCP.

---

## Required Fixes

### Convert Formats

Convert all:

```text
JPEG
PNG
```

to:

```text
AVIF
WebP
```

Priority order:

1. AVIF
2. WebP fallback

---

### Responsive Images

Implement:

```html
<picture>
  <source type="image/avif">
  <source type="image/webp">
  <img>
</picture>
```

Use:

```html
srcset
sizes
```

---

### Resize Assets

Hero images:

```text
Current: 2752x1235

Target:
Desktop: ~1600px wide
Tablet: ~1200px wide
Mobile: ~800px wide
```

---

### Compression Targets

Hero images:

```text
< 250 KB
```

Banner images:

```text
< 150 KB
```

Category thumbnails:

```text
< 50 KB
```

---

# 4. LCP Optimization

Current Mobile LCP:

```text
40.4 seconds
```

Target:

```text
< 2.5 seconds
```

### Tasks

#### Hero Image

Add:

```html
fetchpriority="high"
```

Do NOT lazy load the first hero image.

```html
loading="eager"
```

#### Preload Hero Asset

```html
<link rel="preload">
```

for the initial hero image.

#### Reduce Hero Payload

Remove oversized hero media.

---

# 5. JavaScript Bundle Optimization

Current bundle:

```text
~2.6 MB
```

Estimated unused JS:

```text
309 KB
```

### Tasks

#### Route Splitting

Implement:

```tsx
React.lazy()
Suspense
```

for:

* Product pages
* Account pages
* Dashboard pages
* Admin pages

---

#### Dynamic Imports

Load only when needed:

* Analytics
* Tracking
* Recommendation engine
* Currency conversion

---

#### Tree Shaking

Remove:

* Dead code
* Unused utilities
* Unused libraries

---

# 6. Render Blocking Resources

### Problem

Render-blocking CSS and font requests are delaying rendering.

### Tasks

Inline:

```css
critical CSS
```

Defer:

```css
non-critical CSS
```

Use:

```html
font-display: swap;
```

for all web fonts.

---

# 7. Third-Party Request Optimization

### Problem

Heavy dependency chain exists involving:

* FreeCurrencyAPI
* Supabase
* External image hosts
* Facebook Pixel

### Tasks

#### Currency API

Cache exchange rates.

Refresh:

```text
Every 6–12 hours
```

instead of every page load.

#### Product Images

Proxy and optimize external images.

Store optimized versions locally or through CDN.

#### Facebook Pixel

Load only after user interaction or consent.

---

# Phase 3 — Accessibility Improvements

---

## 8. Missing Button Labels

### Problem

Mobile menu button lacks accessible text.

### Fix

Add:

```html
aria-label="Open menu"
```

---

## 9. Cart Link Accessibility

### Problem

Cart link has no discernible name.

### Fix

Add:

```html
aria-label="Shopping cart"
```

---

## 10. Viewport Accessibility

### Problem

Current:

```html
maximum-scale=1
```

Prevents zooming.

### Fix

Replace with:

```html
<meta
 name="viewport"
 content="width=device-width, initial-scale=1"
/>
```

---

## 11. Footer Heading Hierarchy

### Problem

Footer headings skip semantic order.

### Fix

Maintain:

```html
h1
h2
h3
h4
```

without skipping levels.

---

## 12. Touch Target Improvements

Increase footer link click areas.

Minimum target:

```text
44px × 44px
```

---

# Phase 4 — Infrastructure & Reliability

---

## 13. Supabase Realtime Failure

### Problem

Repeated WebSocket failures:

```text
ERR_NAME_NOT_RESOLVED
```

from Supabase realtime endpoints.

### Tasks

Verify:

* Project URL
* DNS resolution
* Environment variables
* Realtime configuration

Disable realtime if unused.

---

## 14. Remove Deprecated Browser APIs

### Problem

Deprecated unload event listeners detected.

### Tasks

Replace:

```javascript
window.unload
```

with:

```javascript
pagehide
visibilitychange
```

---

## 15. Source Maps

Generate production source maps.

Benefits:

* Easier debugging
* Better Lighthouse diagnostics
* Improved error tracking

---

# Phase 5 — Security Hardening

---

Implement:

## Headers

```http
Content-Security-Policy
Strict-Transport-Security
X-Frame-Options
Cross-Origin-Opener-Policy
```

---

## Trusted Types

Protect against:

```text
DOM XSS
```

---

## Cookie Security

Use:

```http
Secure
HttpOnly
SameSite=Lax
```

or stricter where possible.

---

# Phase 6 — AI Agent Optimization

---

## llms.txt

Current implementation fails validation.

### Required Structure

```markdown
# MotorVault

## About

MotorVault is a marketplace for automotive parts.

## Important URLs

- /products
- /categories
- /contact
- /shipping
- /returns

## AI Crawling Policy

Allowed:
- Product pages
- Categories

Disallowed:
- User dashboards
- Checkout
- Admin routes
```

---

# Definition of Done

## Functional

* Tickets page works for authenticated users.
* Contact form works anonymously.
* No authentication-related errors.

## Performance

Desktop:

```text
90+ Lighthouse
```

Mobile:

```text
90+ Lighthouse
```

LCP:

```text
< 2.5s
```

FCP:

```text
< 1.8s
```

## Accessibility

```text
95+ Lighthouse
```

No missing:

* aria-labels
* heading hierarchy
* touch targets

## Reliability

* No console errors.
* No Supabase websocket failures.
* No deprecated API warnings.

## Security

* CSP configured.
* HSTS configured.
* Trusted Types configured.
* Secure cookies configured.

## AI Readiness

* Valid llms.txt
* Agent accessibility passes
* AI browsing score passes

```
```

also the website loads too slowly especially on initial load,fix that the page needs to load faster and the images need to be optimized for faster loading times. Most especially when a language is selected (automatically or manually) the pages take too much time to load, this needs to be fixed.