# External Data Sources

Tables, charts, and form selects often need data the model cannot (and should not) invent: incidents from your tracker, sales from your warehouse, countries from a reference list. External data sources let the document **name** that data instead of containing it.

The LLM writes `{ source, params }` and never the rows. Your application registers what each source name means, and the runtime fetches the rows when the document renders.

## The Idea

```mdma
id: open-incidents
type: table
columns:
  - key: title
    header: Title
  - key: severity
    header: Severity
    sortable: true
data:
  source: incidents
  params:
    status: open
sortable: true
pageSize: 10
```

The block above carries no rows. `incidents` is a name your host registered, and `params` are the arguments the model chose for it. The host owns the data, its freshness, and its access rules; the model only picks a source and its parameters.

Three things follow from this:

- **No invented data.** The model is told which sources exist (see [Teaching the Model](#teaching-the-model-about-your-sources)) and is told never to fabricate rows when no source fits.
- **Validatable.** A `{ source, params }` reference can be checked against the source's declaration before anything renders (see [Validation](#validation)).
- **Live.** Params can contain `{{bindings}}`, so a table can react to a form field. Paging, sorting, and filtering are sent to your resolver.

## Where a Source Can Be Used

A data source ref is accepted in three places:

| Component | Property | Source `kind` | Rows look like |
|-----------|----------|---------------|----------------|
| `table` | `data` | `rows` | Objects keyed by the table's `columns[].key` |
| `chart` | `data` | `series` | Objects keyed by the chart's `xAxis` / `yAxis` fields |
| `form` (`select` field) | `options` | `options` | `{ label, value }` objects |

The `kind` is part of the contract: the validator rejects a `rows` source used as a chart's `data`, and so on.

When the same data is needed both as a table and as a chart, declare **two sources**, a `rows` one and a `series` one (for example `sales-records` and `sales-by-month`). Each can be backed by the same resolver.

### Table

```mdma
id: sales-table
type: table
columns:
  - key: month
    header: Month
  - key: revenue
    header: Revenue
    sortable: true
data:
  source: sales-records
  params:
    year: 2026
```

### Chart

```mdma
id: sales-chart
type: chart
variant: bar
xAxis: month
yAxis: revenue
data:
  source: sales-by-month
  params:
    year: 2026
```

### Form select

A select field can take a ref object, or just the source name when it needs no params:

```mdma
id: filters
type: form
fields:
  - name: region
    type: select
    label: Region
    options:
      source: countries
      params:
        region: Europe
  - name: country
    type: select
    label: Country
    options: countries
onSubmit: apply-filters
```

If the selected value is no longer among the options after they reload (for example the `region` param changed), the runtime clears the field.

### Params that follow other components

A param value can be a [binding](../getting-started/concepts.md#bindings). When the bound value changes, the source is requested again:

```mdma
id: incidents
type: table
columns:
  - key: title
    header: Title
data:
  source: incidents
  params:
    status: open
    service: "{{filters.service}}"
```

## Declaring a Source

A source is declared with a `DataSourceDefinition` from `@mobile-reality/mdma-spec`. `defineDataSource` returns its argument unchanged and only keeps the literal types.

```typescript
import { defineDataSource } from '@mobile-reality/mdma-spec';
import type { DataSourceResolver } from '@mobile-reality/mdma-spec';

const resolveIncidents: DataSourceResolver = async (request, { signal }) => {
  const query = new URLSearchParams({ status: String(request.params.status) });
  if (request.page !== undefined) query.set('page', String(request.page));
  if (request.pageSize !== undefined) query.set('pageSize', String(request.pageSize));
  if (request.sort) query.set('sort', `${request.sort.key}:${request.sort.direction}`);
  if (request.filter) query.set('q', request.filter);

  const response = await fetch(`/api/incidents?${query}`, { signal });
  if (!response.ok) throw new Error(`Incidents request failed (${response.status})`);

  const body = (await response.json()) as { items: unknown[]; count: number };
  return { rows: body.items, total: body.count };
};

export const incidents = defineDataSource({
  name: 'incidents',
  description: 'Operational incidents raised against internal services.',
  kind: 'rows',
  columns: [
    { key: 'id', type: 'string' },
    { key: 'title', type: 'string' },
    { key: 'severity', type: 'string' },
    { key: 'status', type: 'string' },
    { key: 'opened_at', type: 'date' },
  ],
  params: [
    { name: 'status', type: 'string', required: true, allowed: ['open', 'resolved'] },
    { name: 'service', type: 'string' },
  ],
  resolve: resolveIncidents,
});
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | The identifier the model writes in `source`. Must be unique across the catalog. |
| `description` | `string` | Optional. Shown to the model; say what the data is and when to use it. |
| `kind` | `"rows" \| "series" \| "options"` | Which component property the source may feed (see [Where a Source Can Be Used](#where-a-source-can-be-used)). |
| `columns` | `DataSourceColumnDescriptor[]` | Optional. The fields each row carries: `key`, `type` (`string`, `number`, `boolean`, `date`), optional `description`, and `sensitive` (default `false`). The validator checks table `columns[].key` and chart `xAxis` / `yAxis` against these keys. |
| `params` | `DataSourceParamDescriptor[]` | Optional. The arguments the model may pass: `name`, `type` (`string`, `number`, `boolean`), `required` (default `false`), and `allowed` (a closed list of accepted values). |
| `resolve` | `unknown[] \| DataSourceResolver` | The data. A resolver function, or a plain array for static data. Not sent to the model. |

Everything except `resolve` is the **descriptor**: it is what the prompt, the validator, and the CLI see. Only the runtime ever calls `resolve`.

## Registering Sources on the Store

Pass the definitions when creating the store:

```typescript
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import { incidents } from './incidents';

const store = createDocumentStore(ast, { dataSources: [incidents] });
```

`dataSources` also accepts a plain map from source name to a resolver or an array, which is handy when the catalog lives elsewhere (for example only on the prompt side):

```typescript
const store = createDocumentStore(ast, {
  dataSources: {
    incidents: resolveIncidents,
    countries: [
      { label: 'Poland', value: 'PL' },
      { label: 'Germany', value: 'DE' },
    ],
  },
});
```

Rules for what `resolve` can be:

- **A resolver function.** Called with a request and an `AbortSignal` (see below).
- **An array.** The runtime applies the filter, sort, and paging itself and reports the total. Use it for small static lists such as select options.
- **Omitted.** The source still exists for the prompt and validator, but fetching it fails with `No resolver registered for data source "<name>"`, which the renderer shows as the error state.

A document that names a source the store does not know shows the error state `Unknown data source "<name>"`. Duplicate names in an array of definitions throw `Duplicate data source name "<name>"`.

### Server rendering and tests

`store.resolveAllData()` (also exported as `resolveAllData(store)`) returns a promise that settles once every data-driven component in the document has been requested once. Await it before taking a snapshot or rendering to a string.

## The Resolver Contract

```typescript
type DataSourceResolver = (
  request: DataSourceRequest,
  ctx: { signal: AbortSignal },
) => Promise<DataSourceResult>;

interface DataSourceRequest {
  source: string;
  params: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  sort?: { key: string; direction: 'asc' | 'desc' };
  filter?: string;
}

interface DataSourceResult<TRow = unknown> {
  rows: TRow[];
  total?: number;
}
```

| Request field | Meaning |
|---------------|---------|
| `source` | The source name being requested. |
| `params` | The params from the document, with every `{{binding}}` already replaced by its current value. |
| `page` | 1-based page number. Starts at 1 and resets to 1 whenever params, sort, or filter change. |
| `pageSize` | The table's `pageSize`, when set. |
| `sort` | The column the user sorted by (tables with `sortable` columns). |
| `filter` | The text typed in the table's filter box (tables with `filterable: true`). |

Return `rows` for the requested page. Return `total` as the row count across **all** pages: the table uses it to compute the page count.

**When `total` is omitted**, `rows` is taken to be exactly the requested page. The runtime applies no client-side paging, sorting, or filtering to it, and the total stays unknown, so the table shows a single page. Resolvers that return everything at once should therefore either return `total` and honour `page` / `pageSize` themselves, or be registered as a plain array so the runtime does that work.

### Cancellation and debouncing

Pass `ctx.signal` to whatever you call (`fetch`, a database client). The runtime aborts the signal when a newer request replaces the one in flight: the user changed a param, typed in the filter, sorted, turned the page, or the component was removed. An aborted request never overwrites newer rows and never shows an error.

Param changes and filter typing are **debounced by 150 ms** before a request is made, so a burst of keystrokes in a bound form produces one call. Page and sort changes request immediately. Identical in-flight requests from several components are shared into one call.

## Loading, Error, and Empty States

Data-driven components render four states without any host code:

| State | Table | Chart | Form select |
|-------|-------|-------|-------------|
| First load | Loading view | Loading view | Loading view |
| Reload (rows already shown) | Rows stay, loading indicator appears | Loading view | Loading view |
| Failed | Error message with a **Retry** button | Same | Same |
| Zero rows | "No data" | "No data" (with the chart label) | Empty select |

Retry calls `store.retryData(id)`; for a form select the id is `<formId>.<fieldName>`. The same store also exposes `getDataState(key)`, `setDataPage`, `setDataSort`, and `setDataFilter` for hosts that build their own controls.

### Overriding the state views

The React, Vue, and vanilla renderers let you replace each view through the usual element overrides, under the component type they apply to (`table`, `chart`, or `form`), or under `'*'` for all of them:

| Override | Props | Used by |
|----------|-------|---------|
| `dataLoading` | `componentId`, `reloading?` | `table`, `chart`, `form` |
| `dataError` | `componentId`, `error`, `onRetry` | `table`, `chart`, `form` |
| `dataEmpty` | `componentId`, `label?` | `table`, `chart` |

```tsx
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import type {
  DataEmptyElementProps,
  DataErrorElementProps,
  DataLoadingElementProps,
} from '@mobile-reality/mdma-renderer-react';

function Loading({ reloading }: DataLoadingElementProps) {
  return <p>{reloading ? 'Refreshing…' : 'Loading…'}</p>;
}

function Failed({ error, onRetry }: DataErrorElementProps) {
  return (
    <p role="alert">
      {error} <button type="button" onClick={onRetry}>Try again</button>
    </p>
  );
}

function Empty({ label }: DataEmptyElementProps) {
  return <p>{label ? `${label}: nothing to show.` : 'Nothing to show.'}</p>;
}

function App({ ast, store }) {
  return (
    <MdmaDocument
      ast={ast}
      store={store}
      customizations={{
        components: {
          table: { elements: { dataLoading: Loading, dataError: Failed, dataEmpty: Empty } },
        },
      }}
    />
  );
}
```

The React Native renderer ships its own loading, error (with retry), and reload states and does not take these overrides.

### Audit log

Each fetch is recorded in the event log as `data_loading`, then `data_resolved` (with the row count and total) or `data_error`. The `componentId` is the component id, or `<formId>.<fieldName>` for a form select. Param values may be sensitive, so `data_loading` records only the param **keys**.

## Validation

The validator's `data-source` rule (severity `error`, no auto-fix) checks every `{ source, params }` ref. Without a catalog it only checks that `source` is not empty. Pass the catalog to check the rest:

```typescript
import { validate } from '@mobile-reality/mdma-validator';
import { incidents } from './incidents';

const result = validate(markdown, { dataSourceCatalog: [incidents] });
```

`dataSourceCatalog` accepts the same array of definitions you give the store (resolvers are ignored), or a record of descriptors keyed by name. With a catalog, a plain-string `options` value on a select is read as a source name; `{{binding}}` strings are left alone.

| Message | Raised when |
|---------|-------------|
| `Data source ref is missing a "source" name` | `source` is empty. |
| `Unknown data source "<name>"` | The name is not in the catalog. |
| `Data source "<name>" is kind "<kind>" but "<field>" needs kind "<expected>"` | A `rows` source feeds a chart, a `series` source feeds a table, and so on. |
| `Data source "<name>" does not declare param "<param>"` | The ref passes a param the source does not list. |
| `Data source "<name>" is missing required param "<param>"` | A `required` param is absent or null. |
| `Data source "<name>" param "<param>" must be of type <type>` | The literal value has the wrong type (bindings always pass). |
| `Data source "<name>" param "<param>" value "<value>" is not one of the allowed values` | A literal value is not in `allowed`. |
| `Column "<key>" is not provided by data source "<name>"` | A table column key is not among the source's `columns`. |
| `"xAxis" key "<key>" is not provided by data source "<name>"` | A chart `xAxis` or `yAxis` key is not among the source's `columns` (the message names the field). |

Use `exclude: ['data-source']` to switch the rule off.

## Teaching the Model About Your Sources

Give the same definitions to the prompt builder. The model then sees an "Available data sources" catalog (name, kind, description, columns, params with `allowed` values) and the rules: reference data with `{ source, params }`, never invent a source, never generate rows or CSV for data a source covers.

```typescript
import { buildSystemPrompt, getAuthorPromptVariant } from '@mobile-reality/mdma-prompt-pack';
import { incidents } from './incidents';

const systemPrompt = buildSystemPrompt({
  authorPrompt: getAuthorPromptVariant('anthropic/sonnet-5.5').prompt,
  dataSources: [incidents],
});
```

Only descriptors are rendered; `resolve` never reaches the model. Omit `dataSources` (or pass an empty array) and the prompt is unchanged.

When you run an LLM fixer pass over documents that fail validation, pass the catalog there too so the repair keeps refs valid instead of replacing them with inline rows:

```typescript
import { validate } from '@mobile-reality/mdma-validator';
import { buildFixerMessage } from '@mobile-reality/mdma-prompt-pack';
import { incidents } from './incidents';

const dataSources = [incidents];
const result = validate(markdown, { dataSourceCatalog: dataSources });

const unfixed = result.issues.filter((issue) => !issue.fixed);
const userMessage = buildFixerMessage(markdown, unfixed, { dataSources });
```

### From the CLI

`@mobile-reality/mdma-cli` reads a JSON file of descriptors (the same fields as a definition, without `resolve`):

```json
[
  {
    "name": "incidents",
    "kind": "rows",
    "columns": [{ "key": "title", "type": "string" }],
    "params": [{ "name": "status", "type": "string", "required": true }]
  }
]
```

```bash
# Print the system prompt with the catalog included
npx @mobile-reality/mdma-cli prompt --data-sources ./data-sources.json

# Validate documents against the catalog
npx @mobile-reality/mdma-cli validate "docs/**/*.md" --data-sources ./data-sources.json
```

## Static Option Lists vs. Data Sources

Renderers also accept `customizations.dataSources`, a map from a name to a ready-made list of `{ label, value }` options that a select field can reference by name (`options: countries`). That is a renderer-level lookup for fixed lists. The data sources on this page are registered on the **store**, are validated and described to the model, and add params, paging, sorting, filtering, and the loading, error, and empty states. When a name is registered on the store, `options: <name>` resolves through the store.

## Try It

- **Playground.** `examples/playgrounds/data-sources` is an isolated React page with a table (about 10,000 seeded rows, server-side paging and sorting, a filter bound to a select), an error-then-retry scenario, an empty scenario, and a chart. A side panel logs every resolver call, including aborts.

  ```bash
  pnpm install
  pnpm build
  pnpm --filter mdma-playground-data-sources dev
  ```

  It listens on http://localhost:5190.

- **Demo agent.** In the demo app's agent settings, turn on **External data sources**. The agent is then given four prepared sources (`incidents`, `countries`, `sales-by-month` as a `series`, and `sales-records` as the matching `rows` source), and the same catalog is registered on the store, passed to the prompt, used by the validator, and passed to the fixer.

## Common Pitfalls

**Wrong kind** -- A chart pointed at a `rows` source fails validation. Declare a `series` source for charts and a `rows` source for tables, even when both read the same data.

**Forgetting `ctx.signal`** -- Without it, abandoned requests keep running and compete for your backend. Always forward it.

**Returning every row without `total`** -- The table will not page or sort what you return. Return `total` and honour `page`, `pageSize`, `sort`, and `filter`, or register an array.

**Catalog drift** -- The prompt, the validator, and the store should read the same definitions. Export the array once and pass it to all three.
