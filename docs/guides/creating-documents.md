# Creating MDMA Documents

An MDMA document is a standard Markdown file containing one or more interactive component blocks. This guide covers authoring patterns, binding wiring, validation, and common pitfalls.

## Document Structure

An MDMA document mixes regular Markdown with `mdma` fenced code blocks:

````markdown
# Document Title

Regular Markdown content -- headings, paragraphs, lists, links, images -- all work normally.

```mdma
id: my-component
type: form
fields:
  - name: title
    type: text
    label: Title
    required: true
```

More Markdown content can follow.
````

There is no limit on the number of MDMA blocks in a single document. Components are independent unless connected through bindings.

## Component Basics

Every MDMA block must declare `id` and `type`. The `id` must be unique within the document:

```mdma
id: contact-form
type: form
fields:
  - name: email
    type: email
    label: Email
    required: true
    sensitive: true
```

Use descriptive kebab-case names for IDs: `incident-form`, `approval-gate-manager`, `notify-slack-btn`.

## Wiring Components with Bindings

Bindings let components read values from other components. When a form field changes, its value is stored in the binding map under the field's `name`. Other components can reference it with `{{field_name}}`:

````markdown
```mdma
id: user-form
type: form
fields:
  - name: user_email
    type: email
    label: Email
    required: true
    sensitive: true
  - name: user_role
    type: select
    label: Role
    options:
      - { label: Analyst, value: analyst }
      - { label: Manager, value: manager }
```

```mdma
id: manager-gate
type: approval-gate
title: Manager Approval
visible: "{{user_role}}"
allowedRoles:
  - director
```
````

In this example, the approval gate's `visible` property is bound to the `user_role` field. When `user_role` has a truthy value, the gate becomes visible.

### Binding Syntax Rules

- Must start with `{{` and end with `}}`
- The path must start with a letter or underscore
- Only alphanumeric characters, underscores, and dots are allowed
- Dot notation traverses nested objects: `{{component_id.nested.value}}`

### What Can Be Bound

The `disabled` and `visible` base properties accept binding expressions on all component types. Additionally:

- `form` fields have an optional `bind` property
- `tasklist` items have an optional `bind` property
- `table` `data` can be a binding expression instead of inline data
- `webhook` `url` and `body` accept binding expressions

## Marking Sensitive Fields

Any field that contains PII (personally identifiable information) should have `sensitive: true`. This ensures the value is redacted before being written to the event log:

```mdma
id: patient-intake
type: form
fields:
  - name: patient_name
    type: text
    label: Patient Full Name
    required: true
    sensitive: true
  - name: ssn
    type: text
    label: Social Security Number
    required: true
    sensitive: true
  - name: department
    type: select
    label: Department
    options:
      - { label: Cardiology, value: cardiology }
      - { label: Neurology, value: neurology }
```

You can also mark an entire component as sensitive:

```mdma
id: financial-data
type: form
sensitive: true
fields:
  - name: account_number
    type: text
    label: Account Number
  - name: routing_number
    type: text
    label: Routing Number
```

When `sensitive: true` is set on the component, all field values within it are redacted.

## Action Wiring

Components can trigger actions that other components respond to. Actions are referenced by string IDs:

````markdown
```mdma
id: request-form
type: form
fields:
  - name: change_title
    type: text
    label: Change Title
    required: true
  - name: risk_level
    type: select
    label: Risk Level
    options:
      - { label: Low, value: low }
      - { label: Medium, value: medium }
      - { label: High, value: high }
onSubmit: submit-change-request
```

```mdma
id: submit-btn
type: button
text: Submit for Review
variant: primary
onAction: submit-change-request
confirm:
  title: Confirm Submission
  message: Are you sure you want to submit this change request for review?
```

```mdma
id: notify-webhook
type: webhook
url: https://api.example.com/notifications
method: POST
headers:
  Content-Type: application/json
body:
  title: "{{change_title}}"
  risk: "{{risk_level}}"
trigger: submit-change-request
```
````

In this flow:
1. The form's `onSubmit` and button's `onAction` both reference `submit-change-request`
2. The webhook's `trigger` listens for `submit-change-request`
3. When triggered, the webhook sends the form data to the API

## Conditional Visibility and Disabling

Use bindings or literal booleans to control component visibility:

```mdma
id: high-risk-warning
type: callout
variant: error
title: High Risk Detected
content: This change has been classified as high-risk. Additional approvals are required.
visible: "{{risk_level}}"
```

To disable a component:

```mdma
id: deploy-btn
type: button
text: Deploy
variant: danger
disabled: "{{approval_gate.status}}"
onAction: trigger-deploy
```

## Tables with Inline Data

Tables can include inline data or bind to a dynamic source:

```mdma
id: affected-services
type: table
columns:
  - key: service
    header: Service Name
    sortable: true
  - key: status
    header: Status
  - key: owner
    header: Owner
    sensitive: true
data:
  - { service: API Gateway, status: degraded, owner: "team-platform" }
  - { service: Auth Service, status: healthy, owner: "team-identity" }
  - { service: Database, status: critical, owner: "team-data" }
sortable: true
filterable: true
pageSize: 10
```

Or bind to data from another source:

```mdma
id: results-table
type: table
columns:
  - key: name
    header: Name
  - key: score
    header: Score
data: "{{search_results}}"
```

## Approval Gates

For workflows requiring sign-off, use approval gates:

```mdma
id: compliance-approval
type: approval-gate
title: Compliance Officer Sign-off
description: Required for all KYC cases before closure
requiredApprovers: 2
allowedRoles:
  - compliance-officer
  - compliance-lead
onApprove: finalize-case
onDeny: reopen-case
requireReason: true
```

## Validation Checklist

Before finalizing a document, verify:

- [ ] Every component has a unique `id`
- [ ] All PII fields have `sensitive: true`
- [ ] All `{{bindings}}` reference existing fields or component paths
- [ ] Required form fields are marked `required: true`
- [ ] Select fields include an `options` array
- [ ] Action IDs referenced in event handlers (`onSubmit`, `onAction`, `trigger`, etc.) are consistent
- [ ] YAML syntax is valid in all `mdma` blocks
- [ ] Table `data` column keys match the declared `columns[].key` values

Run `mdma lint` to automate these checks:

```bash
npx mdma lint path/to/document.md
```

## Common Pitfalls

**Duplicate IDs** -- The linter will catch this, but duplicate IDs cause unpredictable behavior. Every `id` must be unique across all components in the document.

**Unquoted YAML values** -- Values containing special characters (`:`, `{`, `}`, `#`, `[`, `]`) must be quoted:

```yaml
# Wrong - YAML parser will break
content: Warning: this is dangerous

# Correct
content: "Warning: this is dangerous"
```

**Binding typos** -- A binding like `{{user_eamil}}` (typo) will silently resolve to `undefined`. The linter's `bindings-resolved` rule will warn about unresolvable bindings.

**Missing options on select fields** -- A `type: select` field without `options` will fail schema validation.
