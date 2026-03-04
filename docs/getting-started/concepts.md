# Key Concepts

This page introduces the core concepts behind MDMA: what an MDMA block is, how components communicate through bindings, how events are captured, and how policies govern runtime behavior.

## MDMA Blocks

An MDMA block is a fenced code block in Markdown tagged with the `mdma` language identifier. The content inside is YAML that declares an interactive component:

````markdown
```mdma
id: severity-selector
type: form
fields:
  - name: severity
    type: select
    label: Severity
    options:
      - { label: Critical, value: P1 }
      - { label: High, value: P2 }
```
````

When the parser encounters an `mdma` block, it:

1. Extracts the raw YAML string
2. Parses it into a JavaScript object
3. Validates it against the Zod schema for the declared `type`
4. Replaces the `code` AST node with an `MdmaBlock` node containing the typed `component` object

The result is an `MdmaRoot` tree where standard Markdown nodes and `MdmaBlock` nodes are interspersed.

## Components

MDMA ships with 9 built-in component types:

| Type | Purpose |
|------|---------|
| `form` | Structured data collection with fields, validation, and submit |
| `button` | Clickable action trigger with optional confirmation dialog |
| `tasklist` | Checklist of items that can be individually checked off |
| `table` | Tabular data display with sorting, filtering, pagination |
| `callout` | Highlighted message block (info, warning, error, success) |
| `approval-gate` | Blocks workflow until required approvals are received |
| `webhook` | HTTP request triggered by an action, with policy enforcement |
| `chart` | Data visualization (line, bar, area, pie) |
| `thinking` | Collapsed AI reasoning block (for LLM-generated documents) |

Every component shares a common base:

```yaml
id: unique-identifier        # required, unique within the document
type: component-type          # required, one of the 9 types
label: Display Label          # optional
sensitive: false              # if true, values are redacted in event logs
disabled: false               # boolean or binding expression
visible: true                 # boolean or binding expression
meta: {}                      # arbitrary metadata
```

## Bindings

Bindings connect components to each other by referencing shared state. They use double-brace syntax:

```yaml
data: "{{customer_form.results}}"
disabled: "{{approval_gate.status}}"
```

A binding expression must match the pattern `{{identifier.path}}` where:

- The identifier starts with a letter or underscore
- It contains only alphanumeric characters, underscores, and dots
- It resolves to a value in the document store's binding map

At runtime, the binding resolver walks the dot-separated path against the store's state:

```typescript
import { resolveBindingPath, parseBindingExpression } from '@mdma/runtime';

const path = parseBindingExpression('{{user.profile.name}}');
// path === 'user.profile.name'

const value = resolveBindingPath(state, path);
// walks state.user.profile.name
```

Form fields automatically populate the binding map when their values change. For example, a form field with `name: severity` makes `{{severity}}` available to other components.

## Event Log

Every action dispatched through the document store is recorded in an append-only event log. Each entry contains:

| Field | Description |
|-------|-------------|
| `timestamp` | ISO 8601 datetime |
| `sessionId` | UUID for the current session |
| `documentId` | Identifier of the document |
| `eventType` | One of: `component_rendered`, `field_changed`, `action_triggered`, `integration_called`, `approval_granted`, `approval_denied`, `validation_error`, `policy_violation` |
| `componentId` | Which component generated the event |
| `payload` | Event-specific data (may be redacted) |
| `redacted` | Whether sensitive values were redacted |
| `actor` | Optional actor info (id, role) |

For enterprise use, the `ChainedEventLog` extends this with hash-chained integrity verification. Each entry includes a `sequence` number, `previousHash`, and `hash` field. The chain can be verified at any time:

```typescript
import { ChainedEventLog } from '@mdma/runtime';

const log = new ChainedEventLog(sessionId, documentId);
log.append({ eventType: 'field_changed', componentId: 'form-1', payload: { field: 'email' } });

const result = log.verifyIntegrity();
// { valid: true }
```

## Store Actions

State changes flow through typed actions dispatched to the document store:

| Action Type | Fields | Description |
|-------------|--------|-------------|
| `FIELD_CHANGED` | `componentId`, `field`, `value` | Form field value updated |
| `ACTION_TRIGGERED` | `componentId`, `actionId`, `payload?` | Button click or form submit |
| `COMPONENT_RENDERED` | `componentId` | Component mounted in UI |
| `APPROVAL_GRANTED` | `componentId`, `actor` | Approval gate approved |
| `APPROVAL_DENIED` | `componentId`, `actor`, `reason` | Approval gate denied |
| `INTEGRATION_CALLED` | `componentId`, `integrationId`, `result` | Webhook or external call completed |

## Policies

Policies control what actions are allowed in different environments. A policy is a list of rules:

```typescript
const policy = {
  version: 1,
  rules: [
    {
      action: 'webhook_call',
      environments: ['preview'],
      effect: 'deny',
      reason: 'External webhook calls are blocked in preview',
    },
    {
      action: 'send_email',
      environments: ['preview', 'test'],
      effect: 'deny',
      reason: 'Email sending is blocked in non-production environments',
    },
  ],
  defaultEffect: 'allow',
};
```

The `PolicyEngine` evaluates actions against these rules:

```typescript
import { PolicyEngine } from '@mdma/runtime';

const engine = new PolicyEngine(policy, 'preview');

engine.evaluate('webhook_call');
// { allowed: false, rule: {...}, reason: 'External webhook calls are blocked in preview' }

engine.enforce('webhook_call');
// throws PolicyViolationError
```

This prevents unsafe operations (live webhook calls, email sends) from running in development or preview environments while allowing them in production.

## Redaction

Components and fields marked `sensitive: true` have their values automatically redacted before being written to the event log. MDMA provides three redaction strategies:

- **hash** -- replaces the value with an FNV-1a hash (default)
- **mask** -- shows the first few characters followed by `***`
- **omit** -- replaces with `[REDACTED]`

The PII detector can also scan form fields by name and value pattern to flag fields that likely contain personally identifiable information but lack the `sensitive` flag.

## Attachable Handlers

Each component type has a corresponding "attachable handler" that defines how it initializes, processes actions, and responds to state changes. The handler interface:

```typescript
interface AttachableHandler<TProps = unknown> {
  definition: AttachableDefinition<TProps>;
  initialize?: (ctx: AttachableContext, props: TProps) => ComponentState;
  onAction?: (ctx: AttachableContext, actionId: string, payload: unknown) => Promise<void> | void;
  onStateChange?: (ctx: AttachableContext, newState: ComponentState) => void;
}
```

Handlers are registered in an `AttachableRegistry` and can be extended with custom component types. See [Creating Custom Attachables](../guides/creating-attachables.md) for details.
