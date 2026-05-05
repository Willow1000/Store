# Modern E‑commerce Site

A small modern e‑commerce starter built with React (Vite), Supabase for auth/data, a Node/TypeScript backend (tRPC + Express), Drizzle ORM, and Paystack/Stripe payment integrations.

## Quick overview
- Frontend: `client/` — Vite + React + TypeScript, Tailwind CSS UI, Supabase client hooks.
- Backend: `server/` — Express + tRPC + TypeScript, Drizzle for DB access, internal SDK for session cookie auth.
- Shared types & constants: `shared/`.

Key features
- User authentication (Supabase) and optional SDK session cookie for server-side auth.
- Cart & Orders stored in Supabase (`cart_items`, `orders`).
- Paystack integration implemented server-side (`server/paystack.ts`) and a small client helper (`client/src/lib/paystack.ts`).
- Local product/category caching to remain responsive during HMR/edit cycles.

## Getting started (developer)

Prereqs: Node 18+, pnpm

Install:
```bash
pnpm install
```

Run dev server (frontend + backend dev separately):

- Frontend:
```bash
pnpm --filter client dev
```

- Backend (example):
```bash
pnpm --filter server dev
```

Typecheck:
```bash
pnpm -s tsc --noEmit
```

Build:
```bash
pnpm build
```

Tests (vitest):
```bash
pnpm test
```

## Important files & flow
- `client/src/_core/hooks/useAuth.ts` — frontend Supabase session handling.
- `shared/const.ts` — contains `SESSION_DURATION_MS` (72 hours) used by server-side session creation for SDK auth.
- `server/_core/sdk.ts` — signs/verifies SDK session cookies; uses `SESSION_DURATION_MS` by default.
- `client/src/hooks/useSupabaseProducts.ts` — product/category hooks with local cache to avoid placeholder-only UI during HMR.
- `client/src/hooks/useSupabaseCart.ts` — cart operations that sync with Supabase and local snapshot for header badge.
- `server/paystack.ts` — Paystack helpers and webhook verification.

## Environment variables
Create a `.env.local` file with browser-exposed values prefixed by `VITE_` and server-only values left unprefixed. The canonical names used by the code are:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase project URL and anon key for the client
- `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `VITE_SUPABASE_OAUTH_REDIRECT_URL` — OAuth portal and redirect config for the client. Keep the redirect value path-only when possible, for example `/api/oauth/callback`.
- `VITE_RECAPTCHA_SITE_KEY`, `VITE_PAYSTACK_PUBLIC_KEY` — client-facing widget keys
- `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY` — browser-accessible proxy credentials used by the map and client-side helpers
- `VITE_GA_ID` — Google Analytics measurement ID if analytics is enabled
- `DATABASE_URL`, `JWT_SECRET`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID` — server runtime auth and database settings
- `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `SUPABASE_SERVICE_KEY`, `PAYSTACK_SECRET_KEY`, `STRIPE_SECRET_KEY` — server-side service credentials

`COOKIE_SECRET` and `PAYSTACK_PUBLIC_KEY` are accepted as backward-compatible aliases, but `JWT_SECRET` and `VITE_PAYSTACK_PUBLIC_KEY` are the preferred names.

## Sessions & expiry
- The custom SDK session cookie and token creation use `SESSION_DURATION_MS` (72 hours) defined in `shared/const.ts`.
- Supabase client sessions are respected; the app uses a 72‑hour window for SDK sessions while preserving Supabase behavior.

## Payments
- Server endpoints and helpers are in `server/paystack.ts` (initialization, verification, timeline, export).
- Frontend uses `client/src/lib/paystack.ts` to open Paystack popup with the public key and metadata.

## Notes for contributors
- Keep API surface stable — `server/routers.ts` defines tRPC endpoints.
- When editing auth/session code, ensure `SESSION_DURATION_MS` and SDK signing remain consistent.
- Run `pnpm -s tsc --noEmit` before opening PRs.

If you want a shorter quickstart or CI scripts added to README, say the word and I’ll add them.
