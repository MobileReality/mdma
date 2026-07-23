# Plan — renderer-vue

**Goal:** Add `@mobile-reality/mdma-renderer-vue`, a Vue 3 renderer that mirrors the `renderer-react` API surface and component coverage, with tests, build config, and docs.
**Branch:** loop/renderer-vue
**Created:** 2026-07-23T00:00:00Z

## Tasks

| Step | Title                                                                     | Status | Commit |
| ---- | ------------------------------------------------------------------------- | ------ | ------ |
| 1    | Scaffold package (package.json, tsconfig, vitest) + install                | done   | a793535 |
| 2    | Port styles.css                                                            | done   | 86f9135 |
| 3    | Theme module + theme tests                                                 | done   | b13789f |
| 4    | MdmaProvider (provide/inject) + context tests                              | done   | bca084b |
| 5    | ElementOverrides + CustomVariant contexts                                  | done   | 80a52aa |
| 6    | Store composables (useDocumentState/useComponentState/useBinding) + tests   | done   | 7d0a771 |
| 7    | Renderer props type + RendererRegistry class                               | done   | e907218 |
| 8    | MdastRenderer                                                              | done   | d3a1c81 |
| 9    | MdmaBlockLoading                                                           | done   | 420d13c |
| 10   | FormRenderer                                                               | done   | PENDING |
| 11   | ButtonRenderer + CalloutRenderer                                           | todo   |        |
| 12   | TasklistRenderer + ApprovalGateRenderer                                    | todo   |        |
| 13   | TableRenderer + WebhookRenderer                                            | todo   |        |
| 14   | ChartRenderer + ThinkingRenderer                                           | todo   |        |
| 15   | CustomRenderer + defaultRenderers map + coverage test                      | todo   |        |
| 15.1 | MdmaBlock (dispatch to renderer by component type)                         | todo   |        |
| 16   | MdmaDocument (streaming / partial-thinking / block cache)                   | todo   |        |
| 17   | Public API index.ts + export-parity test vs renderer-react                 | todo   |        |
| 18   | Mount-level integration tests (@vue/test-utils)                            | todo   |        |
| 19   | Package README + docs updates                                              | todo   |        |
| 20   | Changeset                                                                  | todo   |        |
| 21   | Change explainer                                                           | todo   |        |

Status is one of: `todo`, `done`, `blocked`.

Rows 7, 9 and 15 were re-scoped after step 6 (none had started): `defaultRenderers` and
`MdmaBlock` can only exist once the renderers they dispatch to do, so the default map moved
into row 15 and `MdmaBlock` became row 15.1.

The final `Change explainer` row runs after the validation gate is green.

## Validation

Run in this order. Every command must exit zero before the run is complete.

1. `pnpm build`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test`

Scoped per-step check: `pnpm --filter @mobile-reality/mdma-renderer-vue typecheck && pnpm --filter @mobile-reality/mdma-renderer-vue test`.

## Context

- Monorepo: pnpm workspaces + turbo. The new package goes in `packages/renderer-vue`, picked up by the `packages/*` glob in `pnpm-workspace.yaml` — no workspace config edit needed.
- The model to mirror is `packages/renderer-react` (web; 21 source files; `styles.css` driven by `--mdma-*` CSS variables). `packages/renderer-react-native` is the precedent for "a second renderer" but drops `styles.css` and element overrides — the Vue package targets the web, so it mirrors **renderer-react**.
- Public surface to reproduce, from `renderer-react/src/index.ts`: `MdmaDocument`, `MdmaBlock`, `MdastRenderer`, `MdmaBlockLoading`, `MdmaProvider`/`useMdmaContext`, the theme module (`MdmaThemeProvider`, `useMdmaTheme`, `resolveThemeProps`, `themeToCssVars`, `lightTheme`, `darkTheme`), `ElementOverridesProvider`/`useElementOverride` + the seven element prop interfaces, the store hooks, `RendererRegistry`/`createRendererRegistry`/`defaultRenderers`, the ten renderers, and `CustomVariantProvider`/`useCustomVariants`.
- Ten component types each need a default renderer — `renderer-react`'s `tests/renderer-registry.test.ts` asserts coverage against `COMPONENT_TYPES` from the spec; the Vue package gets the same guard.
- **Build decision:** components are authored as `defineComponent` + `h()` render functions in plain `.ts` files — no `.vue` SFCs, no JSX. This keeps the package on the same `tsc -p tsconfig.json` build, `tsc --noEmit` typecheck, and `biome lint src/` as every other package. SFCs would drag in `vue-tsc` plus a bundler and make it the odd one out.
- React idiom → Vue idiom: `createContext`/`useContext` → `provide`/`inject` with an `InjectionKey`; `useSyncExternalStore` over `DocumentStore.subscribe` → `shallowRef` + `store.subscribe` released via `onScopeDispose`, exposed as `computed`; `memo` → dropped (Vue caches renders itself); `CSSProperties` → Vue style bindings, which accept CSS custom properties.
- Tests: the react package's tests are pure logic (registry + theme tokens) and need no DOM. The Vue package adds those **plus** mount tests, so it needs `@vue/test-utils` + `happy-dom` as devDeps and `environment: 'happy-dom'` in its own `vitest.config.ts`. Registry availability confirmed: vue 3.5.40, @vue/test-utils 2.4.11, happy-dom 20.11.1.
- **MR Code Helper artifacts are local-only here.** `.mr-code-helper/` is listed in `.git/info/exclude`, so `.mrflow` maps and the final explainer cannot be staged into step commits the way the skill describes — they are written to the working tree and stay untracked. Twelve leftover maps from previously merged work were deleted before this branch was cut.

## Non-goals

- No Vue demo app, and no changes to `demo/` or `demo-native/`.
- No changes to `spec`, `runtime`, `parser`, `validator`, `agui`, `mcp`, or the prompt pack — the Vue package consumes them unchanged. If a shared behavior looks like it wants extracting, note it and leave it.
- No SFC (`.vue`) authoring, no bundler, no `vue-tsc`.
- No Nuxt / SSR-specific entry points.
- No visual redesign: the Vue renderer emits the same `.mdma-*` class names and ships the same `styles.css`, so a theme stays portable across both renderers.
- Nothing leaves the machine: no push, no PR.

## Risks

- **Reactivity fidelity.** React's `useComponentState` hand-caches a snapshot so unrelated store updates don't churn renderers. The Vue port must not silently lose that — covered by a test that dispatches an unrelated component's change and asserts the snapshot identity holds.
- **`h()` verbosity in the big renderers.** `FormRenderer` (258 JSX lines) and `MdastRenderer` (181) are where a hand-port most likely drifts from the React behavior. Each gets its own step and its own mount test.
- **Element-override resolution order** (`scope` → `'*'` → built-in) is easy to get subtly wrong in `inject`-land; it needs a direct unit test.
- **`MdmaDocument`'s streaming path** — partial-YAML thinking blocks and the parsed-block cache that prevents flicker — is the least obvious code in the package and has no React test to copy. Its tests get written from the source's intent.
- `turbo test` depends on `build`, so a type error anywhere in the workspace blocks the Vue tests; keep the scoped check tight during steps and let checkpoints catch the rest.
