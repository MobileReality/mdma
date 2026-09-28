# external data sources — handoff

Plan was unreviewed (unattended delegate run, per delegate-protocol override).

## What landed
- spec: `DataSourceRefSchema`/`DataSourceDescriptor*` in `packages/spec/src/schemas/data-source.ts`,
  wired into `form.fields[].options`, `table.data`, `chart.data`; three new event types
  (`data_loading`/`data_resolved`/`data_error`).
- runtime: `packages/runtime/src/core/data-source-manager.ts` — cache/dedupe, abort+debounce on
  bound-param change, in-memory pagination/sort/filter fallback, server-side passthrough when a
  resolver returns `total`. Wired into `document-store.ts`: `syncComponentDataSlots` runs on
  every parse of every table/chart/select field (not only a component's first appearance) and
  registers, refetches under a changed ref, or unregisters, so a streamed block's ref is never
  frozen at a truncated intermediate parse — round 1 review caught the original "register once"
  version doing exactly that. Unregisters on component removal, refetches on `FIELD_CHANGED`.
  `resolveAllData(store)` exported from `packages/runtime/src/core/resolve-all-data.ts`.
- validator: `packages/validator/src/rules/data-source.ts`, wired into `ALL_RULES`;
  `ValidatorOptions.dataSourceCatalog`; `select-options`'s misleading comment fixed — a string ref
  is now checked by `data-source`, not skipped as "a binding".
- renderers: all four wired for select/table/chart data refs with loading/error+retry/empty states.
  React and Vue got real element-override slots (`dataLoading`/`dataError`/`dataEmpty`, scoped like
  the rest). React Native and vanilla get the same states but without a formal override system —
  neither package had one before this change, and building one was out of scope.

## Decisions the brief left open
- Cache/dedupe key is `(source, resolvedParams, page, pageSize, sort, filter)` via `JSON.stringify`
  — simplest correct approach; a resolver returning non-JSON-safe param values would need a custom
  key, not attempted here.
- Debounce is 150ms, not configurable via the public API yet (`DataSourceManagerOptions.debounceMs`
  exists internally but isn't threaded through `DocumentStoreOptions` — add if a host needs it).
- Sensitive-column redaction: the data-resolved event log entry never carries row data (only
  `rowCount`/`total`), so there is nothing to redact there. Runtime tables still mask via
  `component.columns[].sensitive` as before — the descriptor's own `sensitive` column flag is not
  yet cross-wired into that (would need the catalog available to the runtime, not just the
  validator, which the brief scoped to a "later prompt/validator catalog").
- RN and vanilla renderer tests needed extra test-only setup: RN required adding
  `react-test-renderer` as a devDependency plus mocking `react-native` (its real package doesn't
  transform under Vite/esbuild outside Metro); vanilla and React needed `happy-dom`.

## Left undone
- No prompt-pack/mcp/cli wiring of the catalog (out of scope per brief).
- RN/vanilla have no formal element-override slots for the new loading/error/empty views — they
  render sensible built-in defaults but a host can't swap them in yet.

## Round 1 review — fixed (blocking, 4/4)
- Ref frozen at first-valid streamed parse (`document-store.ts`): fixed by running
  `syncComponentDataSlots` on every parse via `DataSourceManager.sync`, not only on first
  appearance. Regression test: `data-source-manager.test.ts` "refetches from the real source
  when a streamed re-parse changes the ref on an existing component".
- `data_loading` event logged resolved param *values* unredacted (a sensitive binding's value
  could leak): fixed by logging `paramKeys` (names only) instead of the resolved values.
- Validator's `data-source` rule treated any string as a source name, including chart CSV and
  `{{binding}}` strings on table/chart/options: fixed by splitting into `asOptionsRef` (form
  select only, string shorthand minus bindings) and `asObjectRef` (table/chart, object only).
  Regression tests added for CSV charts, binding-string charts/tables, and binding-string options.
- Shared in-flight fetch aborted for every subscriber when *any one* unregistered, because the
  cached promise was bound to the first caller's own `AbortSignal`: fixed with a refcounted
  shared `AbortController` in `fetchViaResolver` — a caller's own abort only decrements the count,
  the underlying request cancels only once no one still wants it. Regression test:
  "does not fail an in-flight slot when a sibling slot sharing the request aborts".

## Round 1 review — non-blocking, addressed
- 12 duplicate `isDataSourceRef` copies across every renderer + runtime: consolidated into one
  export, `isDataSourceRef`, from `@mobile-reality/mdma-spec` (`packages/spec/src/schemas/data-source.ts`).
- Dead `DataSlot.inflight` field: removed.

## Round 1 review — non-blocking, left as-is (contested or out of scope for this pass)
- Local `RefLike`/`DataSourceRefLike`-shaped types instead of importing `DataSourceRef` and
  parsing: the validator and runtime guards work on loosely-typed YAML/JSON, not a parsed
  component, so a full `DataSourceRefSchema.safeParse` would change error-reporting behavior
  (schema errors vs. these rules' own messages) — left as a follow-up, not attempted here.
- `import('@mobile-reality/mdma-spec').DataSourceDescriptor` inline type in `validator/src/types.ts`
  instead of a top-level `import type`: matches the existing style of every other inline type in
  that same options interface (see `ExpectedComponent`, `Policy` imports nearby) — consistent with
  the file, not fixed.
- In-memory fallback double-pages a resolver that pages itself but omits `total`, and the
  in-memory fallback re-fetches the full set every page change (dedupe key includes `page`): both
  real, neither addressed — the contract ("return everything if you don't set `total`, or opt into
  server-side paging by setting it") needs documenting on `DataResolver`, and the dedupe key
  should probably exclude `page`/`sort`/`filter` for the array/no-total path specifically.
- `unregister` bumps `fetchToken` (fixed) but a resolver that ignores its abort signal can still
  log a stray `data_resolved` for an already-removed slot's key — narrow edge case, not chased.
- `setDataFilter` has no renderer UI, and table-level `filterable`/`sortable` are ignored for
  data-source tables (only `column.sortable` drives header sort) — left for a follow-up pass on
  the renderers, not part of this brief's "loading/error/empty" scope.
- Table flickers to the loading view on every page/sort change instead of showing stale rows
  while refetching — a reasonable v2 polish, not attempted.
- Taste-only: unrelated mask-character formatting churn in `renderer-react/TableRenderer.tsx`,
  and `renderer-react-native/package.json`'s dependency block reordering under pnpm's own
  normalization — left as pnpm produced them.

## Round 2 review — fixed (blocking, 2/2)
- `resolveAllData()` (and any second `fetch()` on an already-loading slot, e.g. `retryData` while
  loading) always ended in `status: 'error'` against a resolver that actually honours its abort
  signal: the second `fetch()` call aborted the slot's own prior request, which — as the sole
  subscriber — aborted the shared cache entry too, but `fetchViaResolver` still joined that same
  (now-doomed) cache entry because its `.finally` eviction runs on a microtask, one tick later.
  Fixed in `data-source-manager.ts`'s `fetchViaResolver`: an entry whose controller has already
  aborted is now treated as absent, so the second call gets its own fresh entry. Regression test:
  "does not end in error when re-fetching an already-loading slot with a signal-honouring resolver".
- Round 1's "sync on every parse" fix (moved `syncComponentDataSlots` to the *start* of the
  `updateAst` loop) made a newly-streamed-in component's data slots register before its
  `defaultValue`s were seeded into `state.bindings`, so a dependent ref's first fetch ran with
  stale/missing params. Fixed by syncing existing components inline (bindings already settled)
  and new components only after their defaults are seeded, matching the constructor path.
  Regression test: "resolves a data ref against a new component default seeded in the same
  updateAst pass".

## Round 2 review — non-blocking, addressed
- Validator's allowed-value check re-implemented the binding-expression regex instead of reusing
  `isBindingExpression` — now shares it.
- Two duplicated/restating doc-comments trimmed (`document-store.ts`'s `syncComponentDataSlots`
  call sites, `data-source-manager.ts`'s `sync()`).

## Round 2 review — non-blocking, left as-is
- A form field removed or renamed mid-stream leaves its `${id}.${oldName}` data slot registered
  (only whole-component removal unregisters). Narrow, and the stale slot is inert (nothing reads
  it) — not chased in this pass.
- Syncing every parse means a truncated intermediate ref during streaming can log a `data_error`
  ("Unknown data source") to the event log and briefly call the real resolver with partial params
  before the next parse corrects it. Suppressing that would need a "block still streaming" signal
  the store doesn't currently have from the parser; left as a follow-up.
- The existing `resolveAllData` "once" test doesn't assert call count and uses a signal-ignoring
  resolver (which is why it didn't catch the round-2 bug on its own) — the new test added
  alongside it does assert both; the old one is left as a baseline "happy path" check.

## Round 3 review — fixed (blocking, 2/2)
- A data ref binding to a component that appears *later* in document order (e.g. a table before
  the form whose field default it filters on) resolved its params against incomplete bindings on
  first fetch, and never refetched — `onBindingsChanged` only fires from `FIELD_CHANGED`, and
  `sync()` only reacts to the ref's own shape changing, not to bindings settling around it. Fixed
  by calling `dataManager.onBindingsChanged(state.bindings)` once after every component in a pass
  has seeded its defaults — in both the constructor and `updateAst`, and also after
  `APPROVAL_GRANTED`/`APPROVAL_DENIED` (the same binding-writer gap, same one-line fix). The
  correction goes through the normal debounce, so it lands a beat after the first (stale) fetch,
  not synchronously — regression tests wait for that. Two regression tests: "resolves a data ref
  that binds to a component appearing later in the document" and "...via updateAst".
- Commit message bodies on this branch exceeded the `commit` skill's two-sentences-total rule.
  Fixed by rewriting the branch's history: `git reset --soft main` (nothing had been pushed) and
  re-committing the same diffs, in the same file groups, with compliant one-sentence bodies. The
  pre-rewrite history is kept on a local branch, `backup-before-reword`, for reference — it is not
  pushed and not part of this PR.

## Round 3 review — non-blocking, left as-is
- `resolveAll()` can resolve while a slot is still `loading` if a debounced refetch is pending
  underneath it (e.g. right after a `FIELD_CHANGED` that hasn't settled yet) — the promise doesn't
  guarantee every slot has *finished*, only that a fetch attempt for each was made. Low impact for
  the documented server-side use case; not chased here.
- `paramsEqual` uses `Object.is`, so a param bound to a whole object (`{{filters}}`, not a scalar
  field of it) that mutates in place never reads as "changed" and won't trigger a refetch. The
  binding resolver returns the same object reference across calls for a nested-object binding;
  fixing this needs either a deep-equal or a version-stamp on `state.bindings[id]`, neither
  attempted here.
- A data-source table whose current page comes back empty (e.g. the server-side total shrank)
  shows the empty state with no pagination controls, so there's no way back to an earlier page —
  a renderer-level polish item, not part of this brief's loading/error/empty scope.

## Round 4 review — VERDICT: merge-with-followups, BLOCKING: 0
Confirmed the round 3 forward-reference fix holds (re-derived independently) and causes no
thrashing. Non-blocking follow-ups, none addressed in this pass:
- `fetch()` doesn't clear a pending `slot.debounceTimer`, so a forward-reference correction (or
  any other debounced refetch) can leave a stray timer that fires a redundant extra fetch ~150ms
  after `resolveAllData()`/`retryData()` already resolved things correctly. Fix: clear the timer
  at the top of `fetch()`.
- The forward-reference fix's first fetch still runs (and gets aborted) with the stale/missing
  param before the corrective one — wasted for a resolver with side effects or rate limits. A
  "seed all components, then fetch once" restructuring would remove it, at the cost of a larger
  change to the constructor/updateAst shape than this pass attempted.
- `select-options.ts`/`data-source.ts` comments describe a string `options` value as "a data
  source name" without noting it's resolved via `customizations.dataSources` in the renderers
  (sync, local), not via `createDocumentStore({ dataSources })` (async, host) — a host passing
  `dataSourceCatalog` needs its `customizations.dataSources` names listed there too, or those
  fields get flagged "Unknown data source". Worth a changeset/doc note, not fixed here.
  `dataSourceRule`'s `allowed`-values check only validates string params; a number/boolean param
  outside `allowed` passes silently.
