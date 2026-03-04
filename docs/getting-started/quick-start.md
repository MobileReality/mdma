# Quick Start

Get up and running with MDMA in under five minutes.

## Prerequisites

- Node.js >= 18
- pnpm >= 10

## Install

```bash
# Clone the repository
git clone https://github.com/your-org/mr-mdma.git
cd mr-mdma

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Create Your First Document

Create a file called `my-first-doc.md`:

```markdown
# Employee Onboarding

Welcome to the team! Please fill out the form below.

```mdma
id: onboarding-form
type: form
fields:
  - name: full_name
    type: text
    label: Full Name
    required: true
  - name: email
    type: email
    label: Work Email
    required: true
    sensitive: true
  - name: department
    type: select
    label: Department
    required: true
    options:
      - { label: Engineering, value: engineering }
      - { label: Product, value: product }
      - { label: Design, value: design }
  - name: start_date
    type: date
    label: Start Date
    required: true
onSubmit: submit-onboarding
```

## Onboarding Checklist

```mdma
id: onboarding-tasks
type: tasklist
items:
  - id: laptop
    text: Laptop and equipment received
    required: true
  - id: accounts
    text: Email and Slack accounts activated
    required: true
  - id: repo-access
    text: Repository access granted
  - id: first-meeting
    text: Intro meeting with manager scheduled
onComplete: onboarding-done
```
```

## Validate Your Document

Use `@mobile-reality/mdma-validator` to validate all MDMA blocks programmatically:

```typescript
import { validateDocument } from '@mobile-reality/mdma-validator';

const diagnostics = validateDocument(source, 'my-first-doc.md');
// Returns errors and warnings for schema, IDs, bindings, PII, etc.
```

## Parse Programmatically

Use the `@mobile-reality/mdma-parser` remark plugin to transform Markdown into an MDMA AST:

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mobile-reality/mdma-parser';

const source = `
# Hello

\`\`\`mdma
id: greet-btn
type: button
text: Say Hello
onAction: greet
\`\`\`
`;

const processor = unified().use(remarkParse).use(remarkMdma);
const tree = processor.parse(source);
const ast = processor.runSync(tree);

// ast.children now contains MdmaBlock nodes alongside regular mdast nodes
```

## Create a Runtime Store

The `@mobile-reality/mdma-runtime` package provides a headless document store that manages state, events, and policies:

```typescript
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import { registerAllCoreAttachables } from '@mobile-reality/mdma-attachables-core';
import { AttachableRegistry } from '@mobile-reality/mdma-runtime';

// Register core component handlers
const registry = new AttachableRegistry();
registerAllCoreAttachables(registry);

// Create the store from a parsed AST
const store = createDocumentStore(ast, {
  sessionId: crypto.randomUUID(),
  documentId: 'onboarding-001',
  environment: 'preview',
  registry,
});

// Dispatch actions
store.dispatch({
  type: 'FIELD_CHANGED',
  componentId: 'onboarding-form',
  field: 'full_name',
  value: 'Jane Doe',
});

// Read state
console.log(store.getBindings()); // { full_name: 'Jane Doe' }
```

## Render with React

Wrap your app with `MdmaProvider` and render MDMA blocks:

```tsx
import { MdmaProvider, MdmaDocument } from '@mobile-reality/mdma-renderer-react';

function App() {
  return (
    <MdmaProvider store={store} ast={ast}>
      <MdmaDocument />
    </MdmaProvider>
  );
}
```

## Next Steps

- [Key Concepts](./concepts.md) -- understand MDMA blocks, bindings, events, and policies
- [Architecture Overview](./architecture.md) -- how the packages fit together
- [Creating Documents](../guides/creating-documents.md) -- in-depth authoring guide
- [Component Catalog](../reference/component-catalog.md) -- full reference for all 9 component types
