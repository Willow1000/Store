# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Hosted Stripe Checkout as a payment option alongside Paystack, including a
  webhook (`/api/webhooks/stripe`) that creates the order on
  `payment_intent.succeeded`.
- VIN decoder (`/vin-decoder`): decodes a VIN and matches it against the
  product catalog to surface compatible parts.
- CI pipeline (GitHub Actions): typecheck, formatting check, tests with
  coverage, and a dependency audit on every push and pull request.
- `docker-compose.yml` for a local Postgres instance, and `.env.example`
  documenting every environment variable the app reads.
- `renovate.json` for automated dependency update PRs.
- Structured logging (`pino`) in the email service.

### Fixed
- `.gitignore` had blanket rules (`*.test.ts`, `.env*`) that hid real vitest
  spec files and `.env.example` from every commit.
- Stripe webhook signature verification was silently broken (a missing
  `await`), and Checkout Session metadata wasn't propagated to the
  underlying PaymentIntent, so successful payments never created an order.
- Payment records were written before their order existed, permanently
  orphaning the `orderId` reference.
- `categories`/`offers`/`cart`/`wishlist` tRPC routers had been accidentally
  dropped while adding new routes, breaking the whole app's typecheck.
- Checkout's promo-code discount state was referenced outside the scope it
  was defined in, throwing at runtime for both payment providers.
- Session-expiry detection missed several Supabase JWT-expiry message
  variants.

### Changed
- Extracted SEO helpers (`server/_core/seo.ts`) and checkout snapshot
  helpers (`client/src/lib/checkoutSnapshot.ts`) out of `app.ts` and
  `Checkout.tsx`.
- Applied Prettier formatting repository-wide.
