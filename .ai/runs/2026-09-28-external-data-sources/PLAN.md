# external data sources — plan (unreviewed, unattended run)

Goal: form select options, table.data, chart.data resolvable from host-registered async
external data sources `{ source, params }`. Spec + runtime + validator + 4 renderers.

## Steps
1. spec: `DataSourceRefSchema`, `DataSourceDescriptor*`, wire into form/table/chart, new event types.
2. runtime: `DataSourceManager` (cache, dedupe, abort, debounce, pagination/sort/filter fallback),
   wire into `document-store` (register on create, refetch on binding change), `resolveAllData`.
3. validator: `data-source` rule (syntax + catalog), fix `select-options` comment, wire ValidatorOptions.
4. renderers (react, vue, react-native, vanilla): loading/error/retry/empty states for
   table/chart/select data sources, table pagination/sort driven by runtime state.
5. tests per package + changeset.

## Notes
- Plan unreviewed (unattended run, proceeding per delegate-protocol override).
- Fetch only registered once component fully parsed (isMdmaBlock) — true by construction.
