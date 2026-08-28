# Contributing

## Setup

```bash
cp .env.example .env.local   # fill in the values you need
docker-compose up -d          # local Postgres at localhost:5432
pnpm install
pnpm dev
```

## Before opening a PR

Run these locally - CI (`.github/workflows/ci.yml`) runs the same checks on
every push and pull request:

```bash
pnpm run check                        # tsc --noEmit
pnpm exec prettier --check .          # add --write to fix formatting
pnpm test                             # vitest
```

## Commit and PR conventions

- One feature or fix per commit/PR, with the tests that cover it in the same
  commit. Avoid bundling unrelated formatting, refactors, and features into
  one large commit - it makes the change harder to review and harder to
  revert independently if something breaks.
- Prefer a short, imperative commit subject (`fix: ...`, `feat: ...`,
  `refactor: ...`, `test: ...`, `docs: ...`, `chore: ...`) with a body
  explaining *why*, not just what changed - the diff already shows what.
- Run the checks above before pushing; a red CI run on `main` blocks
  everyone.

## Project layout

- `client/` - Vite + React + TypeScript frontend.
- `server/` - Express + tRPC backend, Drizzle ORM for Postgres access.
- `shared/` - types and constants used by both.
- `drizzle/` - database schema (`schema.ts`) and migrations.

See `README.md` for environment variables, payment integration notes, and
session/auth details.
