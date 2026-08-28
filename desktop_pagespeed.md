# Motorvault.shop — performance improvement brief

**Lighthouse scores:** Performance 55 · Accessibility 93 · Best Practices 77 · SEO 100
**Key metrics:** LCP 9.5s · FCP 2.8s · TBT 140ms · SI 3.7s · Total payload ~16 MB

---

## P1 — Image optimization (est. 12,255 KiB savings)

### Convert hero images to WebP and resize to displayed dimensions (~9.8 MB savings)

Three hero images in `client/src/components/HeroSlideshow.tsx` are JPEGs served at 2752×1235px but displayed at 1335×745px. Each is 3–3.5 MB. Convert to WebP and serve at the correct dimensions.

Files:
- `/images/hero/professionals_inspecting_the_motor_parts_202605050024.jpeg`
- `/images/hero/high_quality_motor_parts_2K_202605050023.jpeg`
- `/images/hero/professional_installation_of_motor_parts_202605050032.jpeg`

### Convert banner images to WebP and resize (~1 MB savings)

Three banners in `client/src/components/BannerCarousel.tsx` are served at 1086×768px but displayed at 788×440px.

Files:
- `/images/banners/seats_banner_homepage.jpeg`
- `/images/banners/Motor-parts_banner_for_Tire_Homepage.jpeg`
- `/images/banners/Motor-parts_banner_for_Bumpers_HOmepage.jpeg`

### Add responsive `srcset` for product recommendation images (~1.8 MB savings)

20+ product images in `client/src/components/ProductRecommendationSection.tsx` are fetched from `img.kleinanzeigen.de` at ~960×720px but displayed at 269×202px. These are external URLs — add `width` and `sizes` attributes so the browser doesn't download oversized images. Where the external API supports URL parameters for resizing, use them.

---

## P1 — LCP fix (current LCP: 9.5s)

### Add `fetchpriority="high"` and ensure the LCP image is eagerly loaded

The LCP element is the "Premium Motor Parts Quality" hero image in `HeroSlideshow.tsx`. It has a 2,890ms resource load delay. The image is not discoverable from the initial HTML and `fetchpriority=high` is missing.

```tsx
<img
  src="/images/hero/high_quality_motor_parts_2K_202605050023.jpeg"
  fetchpriority="high"
  loading="eager"
  alt="Premium Motor Parts Quality"
  className="w-full h-full object-cover"
/>
```

Also add a preload hint in `<head>` so the browser starts fetching before JS executes:

```html
<link
  rel="preload"
  as="image"
  href="/images/hero/high_quality_motor_parts_2K_202605050023.jpeg"
/>
```

### Add preconnect hints for Supabase and kleinanzeigen (~170ms savings)

These origins serve critical resources but have no preconnect. Add to `<head>`:

```html
<link rel="preconnect" href="https://dormxdlqbstebbsumdjj.supabase.co" />
<link rel="preconnect" href="https://img.kleinanzeigen.de" />
```

---

## P2 — Render-blocking requests (est. 90ms savings)

### Defer or self-host Inter font

`fonts.googleapis.com/css2?family=Inter…` is a render-blocking request adding 200ms. The `woff2` file it loads (`UcC73FwrK….woff2`) is at the end of a 1,722ms critical chain.

Options in order of impact:
1. Self-host Inter using `@fontsource/inter` — eliminates the external round-trip entirely
2. Preload the woff2 directly in `<head>` to shortcut the chain
3. Verify `display=swap` is actually being applied (it's in the URL but confirm it renders)

### Inline critical CSS from `index-CTLQ3_OP.css`

The 24.6 KiB CSS file blocks rendering for 100ms. Extract above-the-fold styles and inline them in `<head>`. Defer the rest:

```html
<link
  rel="stylesheet"
  href="/assets/index-CTLQ3_OP.css"
  media="print"
  onload="this.media='all'"
/>
```

---

## P2 — JavaScript (est. 309 KiB unused, forced reflows)

### Code-split `index-BO7Y3kGG.js` — 2.6 MB bundle

173.9 KiB of this bundle is unused on initial load. Enable route-based code splitting in Vite so only homepage-required code downloads first. The inline root script (`motorvault.shop`) also has 64.3 KiB unused — audit top-level imports.

### Fix forced reflows in `index-BO7Y3kGG.js`

Two locations cause 59ms + 58ms reflows by reading layout properties (e.g. `offsetWidth`) after DOM mutations:

- Line 18:1360
- Line 79:22242 and 79:34395

Batch DOM reads before writes, or replace inline geometry queries with `ResizeObserver`.

### Lazy-load Facebook Pixel

`fbevents.js` has 33.6 KiB of unused code and a 20-minute cache TTL (should be at least 1 week). Load it with `defer` or after the `load` event so it doesn't block render:

```html
<script defer src="https://connect.facebook.net/en_US/fbevents.js"></script>
```

### Minify `ui-vendor-Bi4xQFqB.js` (~2.4 KiB savings)

This vendor chunk is not fully minified. Ensure it passes through Vite's production build pipeline (esbuild or Terser).

---

## P2 — Console errors and deprecated APIs

### Fix Supabase WebSocket — `ERR_NAME_NOT_RESOLVED`

Supabase Realtime is failing to connect to `dormxdlqbstebbsumdjj.supabase.co` three times on every page load. Either the Supabase project is paused/deleted, or the environment variable is wrong in production. Check that `VITE_SUPABASE_URL` (or equivalent) resolves correctly.

### Remove deprecated `unload` event listener

An `unload` listener at line 213:65214 of the main bundle is deprecated and prevents back-forward cache (bfcache). Replace with `pagehide` or `visibilitychange`:

```js
// Before
window.addEventListener('unload', handler)

// After
window.addEventListener('pagehide', handler)
```

---

## P3 — Accessibility, security, and miscellaneous

### Fix viewport meta — zoom is blocked

`maximum-scale=1` prevents users from zooming, which fails accessibility best practices.

```html
<!-- Before -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">

<!-- After -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

File: `index.html` (or wherever the viewport meta is set)

### Fix heading order in `Footer.tsx`

`Footer.tsx:21` uses an `<h4>` without a preceding `<h2>` or `<h3>`, breaking the document outline for screen readers. Change to `<h2>` or `<h3>` as appropriate.

### Fix `llms.txt` — file has no links

The `llms.txt` file fails the Agentic Browsing audit because it contains no links. It needs at minimum an H1 header and links to key site sections. Add structured Markdown content to `/public/llms.txt`:

```md
# Motorvault

Motorvault is an online marketplace for motor parts.

## Key pages

- [Home](https://www.motorvault.shop/)
- [Products](https://www.motorvault.shop/products)
- [About](https://www.motorvault.shop/about)
```

### Add security headers

These are configured at the server or CDN level (Nginx, Cloudflare, Vercel `headers` config), not in the React app. All five are currently missing:

| Header | Purpose |
|--------|---------|
| `Content-Security-Policy` | XSS protection |
| `Strict-Transport-Security` | HTTPS enforcement |
| `Cross-Origin-Opener-Policy` | Process isolation |
| `X-Frame-Options` or CSP `frame-ancestors` | Clickjacking prevention |
| `Require-Trusted-Types-For` | DOM XSS mitigation |