# Motorvault.shop — mobile performance brief

**Device:** Moto G Power (slow 4G throttling)
**Lighthouse scores:** Performance 51 · Accessibility 80 · Best Practices 77 · SEO 100 · Agentic 1/3
**Key metrics:** LCP 77.2s · FCP 16.2s · TBT 210ms · SI 23.9s · Total payload ~17 MB

> These numbers are dramatically worse than desktop (LCP 9.5s → 77.2s, FCP 2.8s → 16.2s). The root cause beyond images is a new one: **the site is firing 200+ sequential translation API calls to `translate.googleapis.com` on page load**, each taking 2–11 seconds and chaining into an 11.7 second critical path. Fix that first — it's the dominant driver of mobile LCP.

---

## P0 — Translation waterfall (NEW — mobile only)

### Replace runtime Google Translate API calls with a proper i18n solution

This is the single biggest mobile-specific issue. The network dependency tree shows **200+ sequential requests** to `translate.googleapis.com` firing after JS loads, with individual calls taking 2–11 seconds each. The maximum critical path latency is 11,737ms — almost entirely caused by this waterfall. The page is translating every string client-side, one request at a time.

**Fix:** Replace the runtime translation calls with a build-time i18n solution. The standard approach for a React/Vite app:

1. Install `react-i18next` and `i18next`
2. Extract all UI strings into locale JSON files (e.g. `public/locales/en/translation.json`, `public/locales/nl/translation.json`)
3. Replace `translate.googleapis.com` API calls with `t('key')` from `useTranslation()`
4. Pre-translate all strings at build time — zero network requests at runtime

```bash
npm install react-i18next i18next i18next-http-backend i18next-browser-languagedetector
```

This eliminates the entire `translate.googleapis.com` chain from the critical path. Everything else on mobile is secondary to this fix.

Also note: the dependency tree shows `kkk` and `kk` being sent as translation strings — these look like test/placeholder values left in the codebase that should be cleaned up.

### Add preconnect for the four high-impact origins (est. 1,230ms savings combined)

Until the translation calls are replaced, add preconnect hints for the origins Lighthouse flagged:

```html
<link rel="preconnect" href="https://translate.googleapis.com" />
<link rel="preconnect" href="https://api.freecurrencyapi.com" />
<link rel="preconnect" href="https://dormxdlqbstebbsumdjj.supabase.co" />
<link rel="preconnect" href="https://img.kleinanzeigen.de" />
```

Note: Lighthouse recommends no more than 4 preconnect hints — these are the four highest-impact ones (320ms, 310ms, 300ms, 300ms respectively). Remove the less-impactful `fonts.gstatic.com` preconnect to stay under the limit if needed.

---

## P1 — Image optimization (est. 12,257 KiB savings)

Same issues as desktop, with slightly larger savings on mobile due to even more oversized images relative to display dimensions.

### Convert hero images to WebP and resize (~9.6 MB savings)

Files in `client/src/components/HeroSlideshow.tsx` — served at 2752×1235px, displayed at mobile-appropriate dimensions. All three are 3–3.5 MB JPEGs.

Files:

- `/images/hero/professionals_inspecting_the_motor_parts_202605050024.jpeg`
- `/images/hero/high_quality_motor_parts_2K_202605050023.jpeg`
- `/images/hero/professional_installation_of_motor_parts_202605050032.jpeg`

### Convert banner images to WebP and resize (~1.6 MB savings)

Four banners in `client/src/components/BannerCarousel.tsx` — served at 1116×768px, displayed at 815×455px. Includes a new banner not seen in the desktop report:

Files:

- `/images/banners/Motor-parts_banner_for_Transmision_Homepage.jpeg` (514 KiB)
- `/images/banners/seats_banner_homepage.jpeg` (488 KiB)
- `/images/banners/Motor-parts_banner_for_Tire_Homepage.jpeg` (444 KiB)
- `/images/banners/Motor-parts_banner_for_Bumpers_HOmepage.jpeg` (370 KiB)

### Resize eBay category images — new on mobile (~720 KiB savings)

Two eBay images in `client/src/pages/Home.tsx:322` are served at full resolution (1600×1347px and 1073×900px) but displayed at 333×333px and 390×280px.

```
https://i.ebayimg.com/images/g/RZwAAOSwWrdmvrCh/s-l1600.webp  → displayed at 333×333px
https://i.ebayimg.com/images/g/eYwAAOSwaSheD3Ly/s-l1600.webp  → displayed at 390×280px
```

eBay image URLs support size suffixes — replace `s-l1600` with `s-l500` or `s-l400` for thumbnails displayed at this size.

### Add `srcset` for kleinanzeigen.de product images (~907 KiB savings)

Same issue as desktop — 15+ product images in `ProductRecommendationSection.tsx` fetched at ~960×720px, displayed at 277×207px. Add `width` and `sizes` attributes. Use kleinanzeigen URL parameters if the API supports resizing.

---

## P1 — LCP fix (current mobile LCP: 77.2s — mostly the translation waterfall)

### LCP breakdown

| Subpart                | Duration    |
| ---------------------- | ----------- |
| Time to first byte     | 20ms        |
| Resource load delay    | 2,730ms     |
| Resource load duration | 170ms       |
| Element render delay   | **9,000ms** |

The 9 second element render delay is the translation waterfall blocking paint. Fixing the i18n issue (P0 above) should collapse this dramatically.

### Fix LCP image priority — `professionals_inspecting_the_motor_parts` is the LCP element on mobile

On mobile the LCP element is the first hero image (different from desktop). Apply `fetchpriority="high"` and ensure no `loading="lazy"` on it:

```tsx
<img
  src="/images/hero/professionals_inspecting_the_motor_parts_202605050024.jpeg"
  fetchpriority="high"
  loading="eager"
  alt="Expert Inspection & Certification"
  className="w-full h-full object-cover"
/>
```

Add a preload hint in `<head>`:

```html
<link
  rel="preload"
  as="image"
  href="/images/hero/professionals_inspecting_the_motor_parts_202605050024.jpeg"
/>
```

---

## P1 — Render-blocking requests (est. 630ms savings — 7× worse than desktop)

### Inline critical CSS or defer `index-CTLQ3_OP.css` (450ms blocked on mobile vs 100ms desktop)

The CSS file blocks for 450ms on slow 4G. Extract above-the-fold styles and inline in `<head>`, defer the rest:

```html
<link
  rel="stylesheet"
  href="/assets/index-CTLQ3_OP.css"
  media="print"
  onload="this.media='all'"
/>
```

### Defer Google Fonts (750ms blocked on mobile vs 200ms desktop)

`fonts.googleapis.com` blocks for 750ms on slow 4G. Self-hosting Inter with `@fontsource/inter` is the cleanest fix — eliminates the external round-trip entirely. The woff2 file (`UcC73FwrK….woff2`) is at the end of a 1,919ms load chain.

---

## P2 — JavaScript execution (1.8s execution time, 3.9s main thread)

### Main thread breakdown

| Category                     | Time    |
| ---------------------------- | ------- |
| Other                        | 1,493ms |
| Script evaluation            | 1,233ms |
| Script parsing & compilation | 569ms   |
| Style & layout               | 349ms   |
| Garbage collection           | 179ms   |

On mobile, JS execution takes 1.8s total (766ms eval + 495ms parse for first-party alone). 11 long tasks were found vs 6 on desktop.

### Code-split `index-BO7Y3kGG.js` — 2.6 MB bundle

172 KiB unused on initial load. Enable route-based code splitting in Vite. The main bundle takes 1,060ms to transfer on slow 4G before any JS runs.

### Fix forced reflows — same locations as desktop, slightly different profile

Reflow locations in `index-BO7Y3kGG.js`:

- Line 18:1360 — 54ms
- Line 79:22242 — 45ms
- Line 79:50900 — 7ms
- Line 79:34395 — 2ms
- `ui-vendor-Bi4xQFqB.js:1:29463` — 0ms (newly appearing on mobile)
- 29ms unattributed

Batch DOM reads before writes or use `ResizeObserver` instead of querying geometry inline.

### Fix non-composited animations — 11 elements flagged on mobile

Lighthouse flagged 11 animated elements using non-composited properties (likely `top`/`left`/`width`/`height` transitions). Replace with `transform` and `opacity` animations, which run on the GPU and don't trigger layout:

```css
/* Avoid — triggers layout */
transition:
  width 0.3s,
  top 0.3s;

/* Prefer — compositor only */
transition:
  transform 0.3s,
  opacity 0.3s;
```

The slideshow dot buttons in `HeroSlideshow.tsx:148` are likely among these — they use `w-3 h-3` with transitions.

### Lazy-load Facebook Pixel

Same as desktop — `fbevents.js` has 33.6 KiB unused, 20-minute cache TTL. Even more impactful on mobile given the constrained bandwidth.

```html
<script defer src="https://connect.facebook.net/en_US/fbevents.js"></script>
```

---

## P2 — Console errors and deprecated APIs

### Supabase WebSocket failing — `ERR_NAME_NOT_RESOLVED` (4 failures on mobile vs 3 on desktop)

Same as desktop but now failing 4 times. Check `VITE_SUPABASE_URL` in production. The project at `dormxdlqbstebbsumdjj.supabase.co` is not resolving.

### Remove deprecated `unload` event listener

Line 213:65214 of the main bundle. Replace with `pagehide` or `visibilitychange` — the `unload` listener prevents bfcache, which is especially valuable on mobile browsers.

---

## P3 — Accessibility (mobile score dropped from 93 → 80)

Three new issues appeared on mobile that weren't flagged on desktop:

### Add accessible name to mobile menu button (`Header.tsx:163`)

The hamburger/menu button in the mobile header has no accessible name. Screen readers announce it as "button" with no context.

```tsx
// Before
<button className="lg:hidden">
  <MenuIcon />
</button>

// After
<button className="lg:hidden" aria-label="Open navigation menu">
  <MenuIcon />
</button>
```

### Add accessible name to cart link (`Header.tsx:119`)

The cart icon link in the header has no discernible text for screen readers or AI agents (this also caused the Agentic Browsing score to drop to 1/3).

```tsx
// Before
<a href="/cart" className="relative flex items-center ...">
  <CartIcon />
</a>

// After
<a href="/cart" aria-label="Shopping cart" className="relative flex items-center ...">
  <CartIcon />
</a>
```

### Increase slideshow dot button touch targets (`HeroSlideshow.tsx:148`)

The slideshow navigation dots are `w-3 h-3` (12×12px) — well below the 44×44px minimum touch target size recommended for mobile. The `aria-label` is correct but the tap area is too small.

```tsx
// Before
<button className="w-3 h-3 rounded-full ..." aria-label="Go to slide 2">

// After — increase hit area while keeping visual size
<button
  className="relative w-3 h-3 rounded-full ..."
  aria-label="Go to slide 2"
  style={{ padding: '16px', margin: '-16px' }}
>
```

Or use a wrapper approach: keep the visual dot small but wrap in a larger invisible touch target div.

### Fix viewport meta — same as desktop

```html
<!-- Before -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1"
/>

<!-- After -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

### Fix heading order in `Footer.tsx:21` — same as desktop

`<h4>` without preceding `<h2>`/`<h3>`. Change to `<h2>` or `<h3>`.

---

## P3 — Agentic Browsing (1/3 — down from 2/3 on desktop)

The score dropped because the two missing accessible names (menu button and cart link) also break the accessibility tree for AI agents.

### Fix `llms.txt` — same as desktop

```md
# Motorvault

Motorvault is an online marketplace for motor parts.

## Key pages

- [Home](https://www.motorvault.shop/)
- [Products](https://www.motorvault.shop/products)
- [About](https://www.motorvault.shop/about)
```

The cart link and menu button fixes above will also resolve the agentic accessibility tree failures automatically.

---

## P3 — Security headers (same as desktop)

Configure at server/CDN level (Nginx, Cloudflare, Vercel headers config):

| Header                                     | Purpose                 |
| ------------------------------------------ | ----------------------- |
| `Content-Security-Policy`                  | XSS protection          |
| `Strict-Transport-Security`                | HTTPS enforcement       |
| `Cross-Origin-Opener-Policy`               | Process isolation       |
| `X-Frame-Options` or CSP `frame-ancestors` | Clickjacking prevention |
| `Require-Trusted-Types-For`                | DOM XSS mitigation      |

---

## Summary: what's new vs the desktop report

| Issue                      | Desktop     | Mobile                          |
| -------------------------- | ----------- | ------------------------------- |
| LCP                        | 9.5s        | 77.2s                           |
| FCP                        | 2.8s        | 16.2s                           |
| Translation waterfall      | Not present | **200+ API calls, 11.7s chain** |
| eBay image oversizing      | Not flagged | Flagged (~720 KiB)              |
| Non-composited animations  | Not flagged | 11 elements                     |
| Long main-thread tasks     | 6           | 11                              |
| Accessibility score        | 93          | 80                              |
| Missing button/link labels | Not flagged | 2 elements                      |
| Touch target size          | Not flagged | Slideshow dots                  |
| Agentic Browsing score     | 2/3         | 1/3                             |
| Render blocking savings    | 90ms        | 630ms                           |
