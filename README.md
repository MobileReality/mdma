# MDMA - Markdown Document Markup Architecture

Interactive, enterprise-grade documents from Markdown. Built for high-stakes environments: healthcare, finance, critical ops.

## What is MDMA?

MDMA extends Markdown with interactive components embedded as fenced code blocks. A standard Markdown document becomes an interactive application:

````markdown
# Patient Intake Form

Please complete all required fields.

```mdma
id: intake-form
type: form
fields:
  - name: patient_name
    type: text
    label: Full Name
    required: true
    sensitive: true
  - name: email
    type: email
    label: Email
    required: true
    sensitive: true
  - name: reason
    type: textarea
    label: Reason for Visit
    required: true
```

```mdma
id: submit-btn
type: button
text: Submit Intake Form
variant: primary
onAction: submit
```
````

## Key Features

- **7 interactive components** - form, button, tasklist, table, callout, approval-gate, webhook
- **Deterministic parsing** - Markdown + YAML, no runtime JS in documents
- **Enterprise audit trail** - Append-only event log with tamper-evident hash chaining
- **PII protection** - Automatic PII detection + configurable redaction strategies (hash, mask, omit)
- **Policy engine** - Allow/deny rules per action and environment
- **Compliance reporting** - Automated compliance checks for enterprise readiness
- **AI authoring** - Prompt pack for AI-assisted document creation and review
- **Extensible** - Plugin architecture via attachable handlers

## Architecture

```
@mdma/spec                 Format specification + Zod schemas
  |
  ├── @mdma/parser         Markdown → MDMA AST (remark plugin)
  ├── @mdma/prompt-pack    AI authoring prompts
  └── @mdma/runtime        State / events / policy engine
        |
        └── @mdma/attachables-core   7 core component handlers
              |
              └── @mdma/renderer-react   React component library
                    |
                    └── @mdma/cli   lint / scaffold / preview / build
```

## Packages

| Package | Description |
|---------|-------------|
| `@mdma/spec` | MDMA format specification, Zod schemas, TypeScript types |
| `@mdma/parser` | remark plugin: Markdown → MDMA-extended AST |
| `@mdma/runtime` | Headless runtime: document store, event bus, audit log, policy engine, redaction, compliance |
| `@mdma/attachables-core` | Core interactive components: form, button, tasklist, table, callout, approval-gate, webhook |
| `@mdma/renderer-react` | React renderer with hooks (`useDocumentStore`, `useComponentState`, `useBinding`) |
| `@mdma/cli` | Developer CLI: lint, scaffold (attachable/blueprint templates) |
| `@mdma/prompt-pack` | AI system prompts for MDMA authoring and document review |

## Blueprints

Ready-to-use interactive documents for high-stakes domains:

| Blueprint | Domain | Description |
|-----------|--------|-------------|
| `incident-triage` | Critical Ops | Severity assessment, stakeholder notification, resolution tracking |
| `kyc-case` | Finance/Compliance | Customer verification workflow |
| `clinical-ops` | Healthcare | Procedure publish/change approval gate |
| `customer-escalation` | Customer Ops | SLA timers, escalation paths |
| `change-management` | Engineering | Release approval (SOX/ISO compliance) |

## Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Lint MDMA documents
pnpm --filter @mdma/cli exec mdma lint "blueprints/*/document.md"

# Scaffold a new attachable
pnpm --filter @mdma/cli exec mdma scaffold attachable my-component

# Scaffold a new blueprint
pnpm --filter @mdma/cli exec mdma scaffold blueprint my-workflow
```

## Enterprise Features

### Tamper-Evident Event Log

```typescript
import { ChainedEventLog } from '@mdma/runtime';

const log = new ChainedEventLog('session-1', 'doc-1');
log.append({ eventType: 'FIELD_CHANGED', componentId: 'form1', payload: { field: 'email' } });

const result = log.verifyIntegrity(); // { valid: true }
```

### PII Detection

```typescript
import { detectPii, auditSensitiveFields } from '@mdma/runtime';

const result = detectPii('email', 'user@example.com');
// { field: 'email', detectedTypes: ['email'], confidence: 1, suggestion: '...' }
```

### Redaction Strategies

```typescript
import { hashStrategy, maskStrategy, omitStrategy } from '@mdma/runtime';

hashStrategy.redact('secret@email.com');  // 'redacted:a1b2c3d4'
maskStrategy.redact('secret@email.com');  // 'sec***'
omitStrategy.redact('secret@email.com');  // '[REDACTED]'
```

### Compliance Reports

```typescript
import { generateComplianceReport } from '@mdma/runtime';

const report = generateComplianceReport(ast, 'doc-1');
// { checks: [...], summary: { total: 4, passed: 3, failed: 0, warnings: 1 } }
```

## Tech Stack

- **TypeScript** monorepo with **pnpm workspaces** + **Turborepo**
- **Unified/remark** for Markdown parsing
- **Zod** for schema validation (single source of truth)
- **React** for rendering
- **Vitest** for testing
- **Changesets** for versioning

## License

Apache-2.0
