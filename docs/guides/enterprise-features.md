# Enterprise Features

MDMA includes features designed for high-stakes, regulated environments: tamper-evident event logs, pluggable redaction strategies, automatic PII detection, and compliance reporting. All enterprise features live in `@mdma/runtime`.

## Event Log Integrity

The standard `AppendOnlyEventLog` records every action but does not provide tamper detection. For environments requiring audit integrity (SOX, HIPAA, ISO 27001), use the `ChainedEventLog`.

### How It Works

Each entry in a `ChainedEventLog` includes:

| Field | Description |
|-------|-------------|
| `sequence` | Monotonically increasing index starting at 0 |
| `previousHash` | Hash of the preceding entry (or genesis hash `0000000000000000` for the first) |
| `hash` | FNV-1a hash of the entry's contents combined with `previousHash` |

This forms a hash chain. If any entry is modified, deleted, or inserted out of order, the chain breaks and `verifyIntegrity()` reports the exact point of tampering.

### Usage

```typescript
import { ChainedEventLog } from '@mdma/runtime';

const log = new ChainedEventLog('session-uuid', 'doc-001');

// Append events
log.append({
  eventType: 'field_changed',
  componentId: 'intake-form',
  payload: { field: 'email', value: '[REDACTED]' },
  redacted: true,
});

log.append({
  eventType: 'approval_granted',
  componentId: 'manager-gate',
  payload: {},
  actor: { id: 'user-42', role: 'manager' },
});

// Verify the chain
const result = log.verifyIntegrity();
console.log(result);
// { valid: true }
```

### Detecting Tampering

If an entry is modified after being appended:

```typescript
const result = log.verifyIntegrity();
// {
//   valid: false,
//   brokenAt: 3,
//   reason: 'Hash mismatch at entry 3: expected "a1b2c3d4", got "00000000"'
// }
```

### Export Formats

```typescript
// Export as JSON array
const entries = log.toJSON();

// Export as JSONL (one JSON object per line) for streaming ingestion
const jsonl = log.toJSONL();

// Filter by component
const gateEvents = log.forComponent('manager-gate');
```

## Redaction Strategies

MDMA provides three built-in redaction strategies. Each implements the `RedactionStrategy` interface:

```typescript
interface RedactionStrategy {
  name: string;
  redact(value: unknown): unknown;
}
```

### Hash Strategy (default)

Replaces the value with an FNV-1a hash. Deterministic: the same input always produces the same hash. Useful for correlating events without exposing raw values.

```typescript
import { hashStrategy } from '@mdma/runtime';

hashStrategy.redact('john@example.com');
// 'a3f2b1c4' (consistent hash)
```

### Mask Strategy

Shows the first few characters followed by `***`. Useful for support workflows where partial visibility is acceptable.

```typescript
import { maskStrategy } from '@mdma/runtime';

maskStrategy.redact('john@example.com');
// 'joh***'

maskStrategy.redact('AB');
// '***'
```

### Omit Strategy

Replaces the value entirely with the string `[REDACTED]`. Maximum privacy.

```typescript
import { omitStrategy } from '@mdma/runtime';

omitStrategy.redact('john@example.com');
// '[REDACTED]'
```

### Automatic Redaction in the Document Store

The document store automatically redacts sensitive values before writing to the event log. It uses the default hash strategy. The decision is based on:

1. **Component-level sensitivity** -- If a component has `sensitive: true`, all values in its events are redacted.
2. **Field-level sensitivity** -- If a form field has `sensitive: true`, that specific field's value is redacted when it appears in `FIELD_CHANGED` events.

```yaml
# Component-level: all fields redacted
id: financial-data
type: form
sensitive: true
fields:
  - name: account_number
    type: text
    label: Account Number
```

```yaml
# Field-level: only email is redacted
id: contact-form
type: form
fields:
  - name: email
    type: email
    label: Email
    sensitive: true
  - name: department
    type: text
    label: Department
```

## PII Detection

The PII detector scans field names and values against known patterns to identify potential personally identifiable information that is not marked `sensitive: true`.

### Supported PII Types

| Type | Field Name Hints | Value Pattern |
|------|-----------------|---------------|
| `email` | email, e-mail, contact | Standard email format |
| `phone` | phone, tel, mobile, cell, fax | 7-15 digit phone format |
| `ssn` | ssn, social_security, national_id, pesel | XXX-XX-XXXX format |
| `credit_card` | card, credit, cc_num | 16-digit card format |
| `name_like` | name, first_name, last_name, patient, customer | "Firstname Lastname" format |

### Scanning Fields

```typescript
import { detectPii, auditSensitiveFields } from '@mdma/runtime';

// Scan a single field
const result = detectPii('patient_email', 'jane@hospital.org');
// {
//   field: 'patient_email',
//   detectedTypes: ['email'],
//   confidence: 1.0,
//   suggestion: 'Field "patient_email" may contain PII (email). Consider adding sensitive: true.'
// }

// Audit all fields in a form
const fields = [
  { name: 'email', sensitive: true },       // skipped (already marked)
  { name: 'phone', sensitive: false },       // flagged
  { name: 'department', sensitive: false },  // clean
];

const findings = auditSensitiveFields(fields);
// [
//   {
//     field: 'phone',
//     detectedTypes: ['phone'],
//     confidence: 0.6,
//     suggestion: 'Field "phone" may contain PII (phone). Consider adding sensitive: true.'
//   }
// ]
```

### Confidence Scoring

Detection uses a two-factor scoring system:

- **Field name match**: +0.6 confidence (field name matches a PII hint pattern)
- **Value pattern match**: +0.4 confidence (value matches the expected format)
- Minimum threshold: 0.3 (either factor alone can trigger detection)
- Maximum confidence: 1.0 (both factors match)

## Compliance Reports

The compliance reporter performs static analysis on an MDMA AST and generates a structured report.

### Checks Performed

| Category | Check | Severity |
|----------|-------|----------|
| `schema` | `unique-component-ids` -- all component IDs are unique | fail if duplicates |
| `security` | `sensitive-fields-marked` -- PII-like fields have `sensitive: true` | warn if missing |
| `policy` | `approval-gate-present` -- document includes at least one approval gate | warn if absent |
| `schema` | `has-interactive-components` -- document includes form components | warn if absent |

### Generating a Report

```typescript
import { generateComplianceReport } from '@mdma/runtime';

const report = generateComplianceReport(ast, 'doc-001');

console.log(report);
// {
//   documentId: 'doc-001',
//   generatedAt: '2025-12-15T10:30:00.000Z',
//   checks: [
//     {
//       category: 'schema',
//       name: 'unique-component-ids',
//       status: 'pass',
//       message: 'All component IDs are unique'
//     },
//     {
//       category: 'security',
//       name: 'sensitive-fields-marked',
//       status: 'warn',
//       message: 'Some PII-like fields may be missing sensitive:true'
//     },
//     {
//       category: 'policy',
//       name: 'approval-gate-present',
//       status: 'pass',
//       message: 'Document includes approval gate(s)'
//     },
//     {
//       category: 'schema',
//       name: 'has-interactive-components',
//       status: 'pass',
//       message: 'Document has interactive form components'
//     }
//   ],
//   summary: {
//     total: 4,
//     passed: 3,
//     failed: 0,
//     warnings: 1
//   }
// }
```

### Report Structure

```typescript
interface ComplianceReport {
  documentId: string;
  generatedAt: string;         // ISO 8601 timestamp
  checks: ComplianceCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

interface ComplianceCheck {
  category: 'security' | 'logging' | 'schema' | 'policy' | 'redaction';
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}
```

## Putting It All Together

A typical enterprise integration combines all features:

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mdma/parser';
import {
  createDocumentStore,
  ChainedEventLog,
  generateComplianceReport,
  auditSensitiveFields,
  AttachableRegistry,
} from '@mdma/runtime';
import { registerAllCoreAttachables } from '@mdma/attachables-core';

// 1. Parse the document
const processor = unified().use(remarkParse).use(remarkMdma);
const tree = processor.parse(source);
const ast = processor.runSync(tree);

// 2. Run compliance checks
const report = generateComplianceReport(ast, 'doc-001');
if (report.summary.failed > 0) {
  throw new Error(`Compliance check failed: ${report.summary.failed} failures`);
}

// 3. Create store with policy enforcement
const registry = new AttachableRegistry();
registerAllCoreAttachables(registry);

const store = createDocumentStore(ast, {
  sessionId: crypto.randomUUID(),
  documentId: 'doc-001',
  environment: 'production',
  policy: {
    version: 1,
    rules: [
      { action: 'send_email', environments: ['preview', 'test'], effect: 'deny' },
      { action: 'webhook_call', environments: ['preview'], effect: 'deny' },
    ],
    defaultEffect: 'allow',
  },
  registry,
});

// 4. Set up chained audit log for tamper-evident logging
const auditLog = new ChainedEventLog(
  crypto.randomUUID(),
  'doc-001',
);

// Mirror store events to the chained log
store.getEventBus().onAny((action) => {
  auditLog.append({
    eventType: action.type === 'FIELD_CHANGED' ? 'field_changed' : 'action_triggered',
    componentId: action.componentId,
    payload: { action: action.type },
  });
});

// 5. Periodically verify integrity
setInterval(() => {
  const integrity = auditLog.verifyIntegrity();
  if (!integrity.valid) {
    console.error('Audit log integrity broken at entry', integrity.brokenAt);
  }
}, 60_000);
```
