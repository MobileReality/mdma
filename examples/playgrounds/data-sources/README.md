# Data sources playground

Isolated page for checking external data sources (`data: { source, params }`) in the React renderer. It does not touch the demo app and runs on its own fixed port.

## Run

```bash
pnpm install
pnpm build            # renderer/runtime packages must be built once
pnpm --filter mdma-playground-data-sources dev
```

Open http://localhost:5190 (`strictPort`: it fails instead of picking another port).

## Scenarios

Switch with the buttons or hash routes.

| Route | Shows |
|---|---|
| `#/table` | About 10k seeded incidents, server-side paging and sorting, and a service filter: `params: { service: "{{filters.service}}" }` bound to a select whose `options: services` come from the store's `dataSources` |
| `#/error` | First call fails on purpose; the error state with Retry, then recovery |
| `#/empty` | Resolver returns zero rows |
| `#/chart` | A chart fed by a source (`sales`) instead of CSV |

The right-hand panel logs every resolver call: `request`, `resolved`, `abort`, `error`. Resolvers wait 600 ms and honour `AbortSignal`, so changing the service mid-request shows an `abort`. Data is deterministic (seeded PRNG).

## Verify

```bash
pnpm --filter mdma-playground-data-sources verify
```

Starts the dev server, drives each scenario with Playwright (load, next page keeps rows, sort request, filter aborts and refetches, error and retry, empty, chart), and exits non-zero on any failed assertion. Screenshots go to `.screenshots/` (gitignored). Needs a Playwright Chromium (`pnpm exec playwright install chromium` if missing).

Mock resolvers live in `src/mock-sources.ts`, scenario markdown in `src/scenarios.ts`.
