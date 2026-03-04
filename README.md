<p align="center">
  <img src="assets/logo.png" alt="MDMA Logo" width="200" />
</p>

<h1 align="center">MDMA</h1>
<p align="center">Markdown Document with Mounted Applications</p>
<p align="center">Interactive documents from Markdown. Built for high-stakes environments: healthcare, finance, critical ops.</p>

## What is MDMA?

MDMA extends Markdown with interactive components defined in fenced `mdma` code blocks. A regular Markdown file becomes an interactive application:

````markdown
# Patient Intake

```mdma
type: form
id: intake-form
fields:
  - name: patient-name
    type: text
    label: "Full Name"
    required: true
    sensitive: true
  - name: email
    type: email
    label: "Email"
    required: true
    sensitive: true
  - name: reason
    type: textarea
    label: "Reason for Visit"
    required: true
```

```mdma
type: button
id: submit-btn
text: "Submit Intake Form"
variant: primary
onAction: submit
```
````

## Components

9 component types: **form**, **button**, **tasklist**, **table**, **chart**, **callout**, **approval-gate**, **webhook**, **thinking**

## Usage

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mdma/parser';
import { createDocumentStore } from '@mdma/runtime';
import type { MdmaRoot } from '@mdma/spec';

// 1. Parse markdown into AST
const processor = unified().use(remarkParse).use(remarkMdma);
const tree = processor.parse(markdown);
const ast = (await processor.run(tree)) as MdmaRoot;

// 2. Create a reactive document store
const store = createDocumentStore(ast, {
  documentId: 'my-doc',
  sessionId: crypto.randomUUID(),
});

// 3. Subscribe to state changes
store.subscribe((state) => {
  console.log('Bindings:', state.bindings);
});

// 4. Dispatch user actions
store.dispatch({
  type: 'FIELD_CHANGED',
  componentId: 'intake-form',
  field: 'patient-name',
  value: 'Jane Doe',
});
```

### In a Chat

```typescript
import { buildSystemPrompt } from '@mdma/prompt-pack';

// Custom prompt prescribes exactly what the LLM should generate
const systemPrompt = buildSystemPrompt({
  customPrompt: `You are a bug tracking assistant. When a user reports a bug,
always generate a single form component matching this exact structure:

\`\`\`mdma
type: form
id: bug-report
fields:
  - name: title
    type: text
    label: "Bug Title"
    required: true
  - name: severity
    type: select
    label: "Severity"
    options:
      - { label: Critical, value: critical }
      - { label: High, value: high }
      - { label: Medium, value: medium }
      - { label: Low, value: low }
  - name: steps
    type: textarea
    label: "Steps to Reproduce"
    required: true
  - name: expected
    type: textarea
    label: "Expected Behavior"
  - name: actual
    type: textarea
    label: "Actual Behavior"
\`\`\``,
});

// Send to any OpenAI-compatible API
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'The login page crashes after entering my password.' },
    ],
  }),
});

// The LLM responds with regular markdown containing ```mdma blocks
// Parse it into an AST + store as shown above
```

### React

```tsx
import { MdmaDocument } from '@mdma/renderer-react';

function App({ ast, store }) {
  return <MdmaDocument ast={ast} store={store} />;
}
```

## Packages

| Package | Description |
|---------|-------------|
| `@mdma/spec` | The foundation of the MDMA ecosystem — Zod schemas, TypeScript types, and AST definitions for all 9 component types. Every other package depends on spec for validation and type safety. |
| `@mdma/parser` | A remark plugin that transforms standard Markdown into an MDMA-extended AST. Extracts `mdma` code blocks, validates YAML against component schemas, and builds a binding dependency graph. |
| `@mdma/runtime` | Headless state management engine for MDMA documents — like a mini state specialized for interactive documents. Manages reactive bindings, dispatches actions, enforces environment policies, and writes every event to a tamper-evident audit log with automatic PII redaction. |
| `@mdma/attachables-core` | Handlers for 7 of the 9 component types — the ones that manage state (form, button, tasklist, table, callout, approval-gate, webhook). Chart and thinking are display-only and rendered directly without state handlers. |
| `@mdma/renderer-react` | React rendering layer with components for all 9 MDMA types and hooks for state access. Provides `MdmaDocument` for full-document rendering and `useComponentState`/`useBinding` for fine-grained reactivity. |
| `@mdma/prompt-pack` | System prompts that teach LLMs how to author valid MDMA documents. Exports `buildSystemPrompt()` to combine the full spec reference with optional custom instructions for domain-specific generation. |
| `@mdma/validator` | Static analysis engine with 10 lint rules covering YAML correctness, schema conformance, ID uniqueness, binding resolution, and PII sensitivity. Powers programmatic validation in CI pipelines and custom tooling. |
| `@mdma/evals` | LLM evaluation suite built on promptfoo with 3 test suites: base generation quality (25 tests), custom prompt compliance (10 tests), and multi-turn conversation handling (11 conversations, 25 turns). Validates that AI-generated MDMA documents are structurally correct and semantically appropriate. |

## Architecture

```
@mdma/spec                  Format specification + Zod schemas
  ├── @mdma/parser          Markdown → MDMA AST (remark plugin)
  ├── @mdma/prompt-pack     AI authoring prompts
  ├── @mdma/validator       Document validation
  └── @mdma/runtime         State / events / policy engine
        └── @mdma/attachables-core   Component handlers
              └── @mdma/renderer-react   React components
@mdma/evals                 LLM evaluation suite (promptfoo)
```

## Getting Started

```bash
pnpm install
pnpm build
pnpm test
```

## Evals

LLM evaluation suite using [promptfoo](https://www.promptfoo.dev/) to verify MDMA generation quality.

```bash
# Run base eval suite (25 tests)
pnpm eval

# Run custom system prompt tests (10 tests)
pnpm eval:custom

# Run multi-turn conversation tests (25 turns across 11 conversations)
pnpm eval:conversation

# Run all eval suites
pnpm eval:all

# View results in browser
pnpm eval:view
```

## Key Features

- **Deterministic parsing** — Markdown + YAML, no runtime JS in documents
- **PII protection** — Automatic detection + redaction (hash, mask, omit)
- **Audit trail** — Append-only event log with tamper-evident hash chaining
- **Policy engine** — Allow/deny rules per action and environment
- **AI authoring** — System prompts for AI-assisted document creation

## Tech Stack

TypeScript monorepo — pnpm workspaces, Turborepo, Zod, React, Vitest, remark

## License

MIT
