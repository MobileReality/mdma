# Component Catalog

Complete reference for all 9 MDMA component types. Each section shows the full schema, all properties, defaults, and a working example.

## Base Properties (all components)

Every component inherits these properties from `ComponentBaseSchema`:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | *required* | Unique identifier within the document. Min length 1. |
| `type` | `string` | *required* | Component type name. |
| `label` | `string` | -- | Optional display label. |
| `sensitive` | `boolean` | `false` | If true, all values from this component are redacted in event logs. |
| `disabled` | `boolean \| binding` | `false` | Disables the component. Accepts a `{{binding}}` expression. |
| `visible` | `boolean \| binding` | `true` | Controls visibility. Accepts a `{{binding}}` expression. |
| `meta` | `Record<string, unknown>` | -- | Arbitrary metadata. |

---

## form

Collects structured user input through typed fields with validation.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `"form"` | *required* | Must be `"form"`. |
| `fields` | `FormField[]` | *required* | At least one field. |
| `onSubmit` | `string` | -- | Action ID triggered on form submission. |

### FormField Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | *required* | Field identifier. Min length 1. |
| `type` | `enum` | *required* | One of: `text`, `number`, `email`, `date`, `select`, `checkbox`, `textarea`. |
| `label` | `string` | *required* | Display label. |
| `required` | `boolean` | `false` | Whether the field must have a value. |
| `sensitive` | `boolean` | `false` | If true, this field's value is redacted in event logs. |
| `defaultValue` | `unknown` | -- | Initial value. |
| `options` | `{ label: string, value: string }[]` | -- | Required when `type` is `"select"`. |
| `validation` | `object` | -- | Optional validation rules (see below). |
| `bind` | `string` | -- | Binding expression in `{{path}}` format. |

### Validation Object

| Property | Type | Description |
|----------|------|-------------|
| `pattern` | `string` | Regex pattern the value must match. |
| `min` | `number` | Minimum value (for numbers) or length. |
| `max` | `number` | Maximum value (for numbers) or length. |
| `message` | `string` | Custom error message on validation failure. |

### Example

```mdma
id: employee-form
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
    validation:
      pattern: "^[^@]+@company\\.com$"
      message: Must be a company email address
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
  - name: notes
    type: textarea
    label: Additional Notes
  - name: agree_to_terms
    type: checkbox
    label: I agree to the terms and conditions
    required: true
onSubmit: submit-onboarding
```

---

## button

A clickable element that triggers an action. Optionally shows a confirmation dialog.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `"button"` | *required* | Must be `"button"`. |
| `text` | `string` | *required* | Button label text. Min length 1. |
| `variant` | `enum` | `"primary"` | One of: `primary`, `secondary`, `danger`, `ghost`. |
| `onAction` | `string` | *required* | Action ID triggered on click. |
| `confirm` | `object` | -- | Optional confirmation dialog (see below). |

### Confirm Object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | `string` | *required* | Dialog title. |
| `message` | `string` | *required* | Dialog message body. |
| `confirmText` | `string` | `"Confirm"` | Confirm button label. |
| `cancelText` | `string` | `"Cancel"` | Cancel button label. |

### Example

```mdma
id: deploy-btn
type: button
text: Deploy to Production
variant: danger
onAction: trigger-deploy
confirm:
  title: Confirm Deployment
  message: This will deploy the current build to production. This action cannot be undone.
  confirmText: Yes, Deploy
  cancelText: Go Back
```

---

## tasklist

A checklist of items that can be individually toggled. Fires an action when all items are checked.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `"tasklist"` | *required* | Must be `"tasklist"`. |
| `items` | `TaskItem[]` | *required* | At least one item. |
| `onComplete` | `string` | -- | Action ID triggered when all items are checked. |

### TaskItem Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | *required* | Unique item identifier within the tasklist. Min length 1. |
| `text` | `string` | *required* | Item description. Min length 1. |
| `checked` | `boolean` | `false` | Initial checked state. |
| `required` | `boolean` | `false` | If true, this item must be checked for the tasklist to be complete. |
| `bind` | `string` | -- | Binding expression in `{{path}}` format. |

### Example

```mdma
id: pre-deploy-checklist
type: tasklist
items:
  - id: tests-pass
    text: All tests pass in CI
    required: true
  - id: code-review
    text: Code review approved by 2 reviewers
    required: true
  - id: staging-verified
    text: Changes verified on staging
    required: true
  - id: rollback-plan
    text: Rollback plan documented
  - id: stakeholders-notified
    text: Stakeholders notified of deployment window
onComplete: ready-to-deploy
```

---

## table

Displays tabular data with optional sorting, filtering, and pagination.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `"table"` | *required* | Must be `"table"`. |
| `columns` | `TableColumn[]` | *required* | At least one column. |
| `data` | `object[] \| binding` | *required* | Array of row objects, or a binding expression. |
| `sortable` | `boolean` | `false` | Enable table-level sorting. |
| `filterable` | `boolean` | `false` | Enable filtering. |
| `pageSize` | `number` | -- | Rows per page (positive integer). |

### TableColumn Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `key` | `string` | *required* | Property key in each data row object. Min length 1. |
| `header` | `string` | *required* | Column header text. Min length 1. |
| `sortable` | `boolean` | `false` | Enable sorting for this column. |
| `sensitive` | `boolean` | `false` | If true, column values are redacted in logs. |
| `width` | `string` | -- | CSS width (e.g., `"200px"`, `"30%"`). |

### Example with Inline Data

```mdma
id: service-status
type: table
columns:
  - key: service
    header: Service
    sortable: true
  - key: status
    header: Status
  - key: owner
    header: Owner
    sensitive: true
  - key: uptime
    header: Uptime %
    sortable: true
    width: "100px"
data:
  - { service: API Gateway, status: healthy, owner: team-platform, uptime: "99.98%" }
  - { service: Auth Service, status: degraded, owner: team-identity, uptime: "99.5%" }
  - { service: Database, status: healthy, owner: team-data, uptime: "99.99%" }
sortable: true
filterable: true
pageSize: 25
```

### Example with Bound Data

```mdma
id: search-results
type: table
columns:
  - key: name
    header: Customer Name
    sensitive: true
  - key: risk_score
    header: Risk Score
    sortable: true
  - key: status
    header: Verification Status
data: "{{screening_results}}"
sortable: true
```

---

## callout

A highlighted message block for alerts, warnings, or informational content.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `"callout"` | *required* | Must be `"callout"`. |
| `variant` | `enum` | `"info"` | One of: `info`, `warning`, `error`, `success`. |
| `title` | `string` | -- | Optional callout title. |
| `content` | `string` | *required* | Message text. Min length 1. |
| `dismissible` | `boolean` | `false` | Whether the user can dismiss the callout. |

### Example

```mdma
id: compliance-notice
type: callout
variant: warning
title: Regulatory Compliance Required
content: >
  This workflow involves personally identifiable information (PII).
  All data is encrypted and access is logged. Ensure you have
  completed the required compliance training before proceeding.
dismissible: false
```

```mdma
id: success-msg
type: callout
variant: success
title: Case Approved
content: The KYC case has been approved and the customer account is now active.
dismissible: true
```

---

## approval-gate

Blocks workflow progression until the required number of approvals is received. Supports role-based access control.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `"approval-gate"` | *required* | Must be `"approval-gate"`. |
| `title` | `string` | *required* | Gate title. Min length 1. |
| `description` | `string` | -- | Additional details about the approval. |
| `requiredApprovers` | `number` | `1` | Number of approvals needed. Positive integer. |
| `allowedRoles` | `string[]` | -- | Restrict who can approve. If omitted, anyone can approve. |
| `onApprove` | `string` | -- | Action ID triggered when approval is granted. |
| `onDeny` | `string` | -- | Action ID triggered when approval is denied. |
| `requireReason` | `boolean` | `false` | Require the denier to provide a reason. |

### Example

```mdma
id: dual-approval
type: approval-gate
title: Production Change Approval
description: >
  Requires sign-off from both a tech lead and a manager.
  This is a SOX compliance requirement for all production changes.
requiredApprovers: 2
allowedRoles:
  - tech-lead
  - engineering-manager
  - director
onApprove: execute-deployment
onDeny: return-to-author
requireReason: true
```

### State After Approval

When approved, the component state is updated:

```typescript
store.dispatch({
  type: 'APPROVAL_GRANTED',
  componentId: 'dual-approval',
  actor: { id: 'user-42', role: 'tech-lead' },
});

// State: { status: 'approved', approvedBy: { id: 'user-42', role: 'tech-lead' } }
// Binding: {{ dual-approval.status }} resolves to 'approved'
```

When denied:

```typescript
store.dispatch({
  type: 'APPROVAL_DENIED',
  componentId: 'dual-approval',
  actor: { id: 'user-99', role: 'engineering-manager' },
  reason: 'Missing rollback plan',
});

// State: { status: 'denied', deniedBy: {...}, deniedReason: 'Missing rollback plan' }
// Binding: {{ dual-approval.status }} resolves to 'denied'
```

---

## webhook

Makes an HTTP request when triggered by an action. Subject to policy enforcement -- blocked in preview environments by default.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `"webhook"` | *required* | Must be `"webhook"`. |
| `url` | `string \| binding` | *required* | Target URL (valid URL) or a binding expression. |
| `method` | `enum` | `"POST"` | One of: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. |
| `headers` | `Record<string, string>` | -- | HTTP headers as key-value pairs. |
| `body` | `object \| binding` | -- | Request body as an object or a binding expression. |
| `trigger` | `string` | *required* | Action ID that triggers this webhook. |
| `retries` | `number` | `0` | Retry count on failure. Integer, 0-5. |
| `timeout` | `number` | `30000` | Timeout in milliseconds. Positive integer. |

### Example

```mdma
id: slack-notification
type: webhook
url: https://hooks.slack.com/services/T00/B00/xxxxx
method: POST
headers:
  Content-Type: application/json
body:
  text: "New incident reported: {{incident_title}} ({{severity}})"
  channel: "#incidents"
trigger: submit-incident
retries: 2
timeout: 10000
```

### Example with Bound URL

```mdma
id: dynamic-webhook
type: webhook
url: "{{webhook_endpoint}}"
method: POST
body: "{{form_data}}"
trigger: send-data
```

### Policy Enforcement

The webhook handler calls `ctx.policy.enforce('webhook_call')` before executing. With the default policy, webhook calls are denied in the `preview` environment:

```typescript
// Default policy rule:
{
  action: 'webhook_call',
  environments: ['preview'],
  effect: 'deny',
  reason: 'External webhook calls are blocked in preview',
}
```

To allow webhooks in a specific environment, configure the policy when creating the document store:

```typescript
const store = createDocumentStore(ast, {
  environment: 'production',
  policy: {
    version: 1,
    rules: [],
    defaultEffect: 'allow',
  },
});
```

---

## chart

Renders data visualizations. Supports line, bar, area, and pie chart types.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `"chart"` | *required* | Must be `"chart"`. |
| `variant` | `enum` | `"line"` | One of: `line`, `bar`, `area`, `pie`. |
| `data` | `string \| binding` | -- | Data source for the chart. |
| `xAxis` | `string` | -- | X-axis field name. |
| `yAxis` | `string \| string[]` | -- | Y-axis field name(s). |
| `colors` | `string[]` | -- | Custom colors for data series. |
| `showLegend` | `boolean` | `true` | Display legend. |
| `showGrid` | `boolean` | `true` | Display grid lines. |
| `height` | `number` | `300` | Chart height in pixels. |
| `stacked` | `boolean` | `false` | Stack data series. |

### Example

```mdma
id: revenue-chart
type: chart
variant: bar
data: "{{monthly_revenue}}"
xAxis: month
yAxis: revenue
colors:
  - "#4f46e5"
  - "#10b981"
showLegend: true
height: 400
```

```mdma
id: status-pie
type: chart
variant: pie
data: "{{ticket_breakdown}}"
xAxis: status
yAxis: count
height: 300
```

---

## thinking

A collapsed reasoning block used in LLM-generated documents. Contains the AI's internal reasoning process, hidden by default.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `"thinking"` | *required* | Must be `"thinking"`. |
| `content` | `string` | *required* | Thinking text content. Min length 1. |
| `status` | `enum` | `"done"` | One of: `thinking`, `done`. |
| `collapsed` | `boolean` | `true` | Whether the block is initially collapsed. |

### Example

```mdma
id: form-reasoning
type: thinking
status: done
collapsed: true
content: |
  The user needs a KYC form. I should include:
  - Full legal name (sensitive)
  - Date of birth (sensitive)
  - SSN/Tax ID (sensitive)
  - Source of funds
  All PII fields must be marked sensitive: true.
```
