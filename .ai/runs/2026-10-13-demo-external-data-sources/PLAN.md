# Plan: demo external data sources toggle

Plan unreviewed (unattended delegate).

## Tasks

| # | Step | Status | Commit |
|---|---|---|---|
| 1 | Demo data-sources module: catalog + seeded resolvers | done | pending |
| 2 | Prompt helpers, store options, use-agent wiring, settings toggle | done | pending |
| 3 | Vitest setup in demo + tests (catalog, resolvers, prompts, store) | done | pending |

## Validation

- pnpm install --frozen-lockfile
- pnpm build
- pnpm typecheck
- pnpm lint
- pnpm test
- pnpm exec biome check on every changed file

## Non-goals

- packages/*, evals/, examples/
- single-agent chat (#/chat) behaviour, prompt wording
