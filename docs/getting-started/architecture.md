# Architecture Overview

MDMA is a TypeScript monorepo managed with pnpm workspaces and Turborepo. It is organized into 7 packages and 5 blueprints.

## Package Dependency Graph

```
@mdma/spec                    Zod schemas + TypeScript types (zero runtime deps beyond zod)
  |
  +-- @mdma/parser            remark plugin: Markdown -> MdmaRoot AST
  |     |
  |     +-- (unified, remark-parse, vfile)
  |
  +-- @mdma/prompt-pack       AI system prompts for authoring & review
  |
  +-- @mdma/runtime           Headless runtime: store, event bus, event log, policy engine,
        |                     redaction, PII detection, compliance reporter
        |
        +-- @mdma/attachables-core    7 built-in component handlers
        |     |
        |     +-- @mdma/renderer-react    React components + hooks
        |
        +-- @mdma/cli                CLI: lint, scaffold
              |
              +-- (commander, chalk, globby)
```

All arrows point downward: each package depends only on packages above it. `@mdma/spec` is the foundation with no internal dependencies.

## Packages

### @mdma/spec

The specification package. Contains:

- **Zod schemas** for all 7 component types, event log entries, policies, bindings, document metadata, and blueprint manifests
- **TypeScript types** inferred from the schemas (`MdmaComponent`, `EventLogEntry`, `Policy`, etc.)
- **AST type definitions** (`MdmaBlock`, `MdmaRoot`)
- **Constants** (`MDMA_LANG_TAG = 'mdma'`, `MDMA_SPEC_VERSION = '0.1.0'`)
- **Component schema registry** mapping type names to their Zod schemas

Dependencies: `zod`

### @mdma/parser

A remark plugin that transforms standard Markdown into an MDMA-extended AST. The pipeline:

1. `extractMdmaBlocks` -- walks the mdast tree, finds `code` nodes with `lang: 'mdma'`
2. `parseYaml` -- parses the YAML content
3. `validateComponent` -- validates against the component schema registry
4. `buildMdmaNode` -- replaces the code node with a typed `MdmaBlock`
5. `extractBindings` / `buildBindingGraph` -- builds a graph of all binding references

Dependencies: `@mdma/spec`, `unified`, `remark-parse`, `vfile`

### @mdma/runtime

Headless runtime with no UI dependencies. Provides:

- **DocumentStore** -- central state container. Manages bindings, component state, and subscriptions. Dispatches `StoreAction` events.
- **EventBus** -- typed pub/sub for `StoreAction` events with `on(type, handler)` and `onAny(handler)`
- **EventLog** -- append-only log of all events with component filtering
- **ChainedEventLog** -- hash-chained event log for tamper-evident audit trails
- **BindingResolver** -- resolves `{{path.to.value}}` expressions against state
- **PolicyEngine** -- evaluates and enforces rules per environment
- **Redactor** -- redacts sensitive values before logging
- **RedactionStrategies** -- `hash`, `mask`, `omit`
- **PII Detector** -- scans field names and values for email, phone, SSN, credit card, and name patterns
- **ComplianceReporter** -- generates compliance reports checking unique IDs, PII marking, approval gates, and interactive components
- **AttachableRegistry** -- registry for component handlers

Dependencies: `@mdma/spec`

### @mdma/attachables-core

Handlers for the 7 built-in component types. Each handler implements the `AttachableHandler` interface with `definition`, `initialize`, and `onAction` methods. The `registerAllCoreAttachables()` function registers all 7 handlers at once.

Dependencies: `@mdma/spec`, `@mdma/runtime`

### @mdma/renderer-react

React rendering layer. Provides:

- **MdmaProvider** / **useMdmaContext** -- React context wrapping the document store
- **MdmaDocument** / **MdmaBlock** -- top-level rendering components
- **Hooks**: `useDocumentStore()`, `useDocumentState()`, `useComponentState(id)`, `useBinding(expr)`
- **RendererRegistry** -- maps component types to React renderer components
- **Built-in renderers**: `FormRenderer`, `ButtonRenderer`, `TasklistRenderer`, `TableRenderer`, `CalloutRenderer`, `ApprovalGateRenderer`, `WebhookRenderer`

Dependencies: `@mdma/spec`, `@mdma/runtime`, `react`

### @mdma/cli

Developer CLI built with Commander. Provides:

- `mdma lint <patterns...>` -- validate MDMA documents against all lint rules
- `mdma scaffold <type> [name]` -- generate attachable or blueprint from templates

The lint engine parses documents with `remarkMdma`, then runs three rule passes: `schema-valid`, `unique-ids`, and `bindings-resolved`.

Dependencies: `@mdma/spec`, `@mdma/parser`, `@mdma/runtime`, `@mdma/attachables-core`, `commander`, `chalk`, `globby`

### @mdma/prompt-pack

AI system prompts for LLM-assisted MDMA authoring and review:

- `mdma-author` -- full format specification, all 7 component types, binding syntax, authoring rules, and self-check checklist
- `mdma-reviewer` -- systematic review instructions for 6 categories: sensitive flags, duplicate IDs, unresolved bindings, missing required fields, action reference integrity, YAML syntax

Prompts are exported as string constants and accessed via `loadPrompt(name)` or `listPrompts()`.

Dependencies: none (pure string constants)

## Blueprints

Blueprints are ready-to-use MDMA documents for specific domains. Each blueprint lives in `blueprints/<name>/` and contains:

```
blueprints/<name>/
  manifest.yaml       Blueprint metadata (name, maturity, components, integrations, checklists)
  document.md         The MDMA document
  README.md           Usage instructions
  demo-data/          Mock data for development
  package.json        Package metadata (private: true)
```

The manifest validates against `BlueprintManifestSchema` from `@mdma/spec`.

### Available Blueprints

| Blueprint | Domain | Components |
|-----------|--------|------------|
| `incident-triage` | Critical Ops | form, tasklist, approval-gate, callout, button |
| `kyc-case` | Finance | form, tasklist, approval-gate, table |
| `clinical-ops` | Healthcare | form, approval-gate, tasklist, callout |
| `customer-escalation` | Support | form, tasklist, button, callout |
| `change-management` | Engineering | form, approval-gate, tasklist, callout |

## Build System

The monorepo uses:

- **pnpm workspaces** with `packages/*` and `blueprints/*` entries
- **Turborepo** for orchestrating `build`, `test`, `lint`, and `typecheck` tasks
- **TypeScript** 5.x with `ES2022` target, `ESNext` modules, `bundler` module resolution
- **Vitest** for testing
- **Changesets** for versioning and publishing

Build order is enforced by Turborepo's `dependsOn: ["^build"]` configuration, ensuring upstream packages are built before their dependents.
