# Creating Blueprints

Blueprints are ready-to-use MDMA document templates for specific domains and workflows. They provide a starting point with pre-configured components, integrations, and compliance checklists.

## Blueprint Structure

Each blueprint lives in `blueprints/<name>/` and contains:

```
blueprints/<name>/
  manifest.yaml       Metadata, components used, integrations, checklists
  document.md         The MDMA document
  README.md           Usage documentation
  demo-data/          Mock data files (JSON) for development and testing
  package.json        Package metadata (private: true)
```

## Scaffold a Blueprint

Use the CLI to generate the directory structure:

```bash
npx mdma scaffold blueprint my-workflow
```

This creates `blueprints/my-workflow/` with starter files.

## The Manifest File

The `manifest.yaml` file declares the blueprint's metadata and validates against `BlueprintManifestSchema` from `@mdma/spec`. Here is a complete example:

```yaml
name: incident-triage
version: "0.1.0"
maturity: experimental
description: >
  Severity assessment, stakeholder notification, and resolution tracking
  for production incidents. Guides responders through structured triage
  with manager sign-off before closure.
outcome: >
  Every incident is classified by severity, stakeholders are notified within
  SLA, and resolution is tracked through a verified checklist with manager
  approval before the incident can be marked resolved.
domain: critical-ops
components_used:
  - form
  - tasklist
  - approval-gate
  - callout
  - button
integrations:
  - name: slack
    type: webhook
    description: Post incident alerts to the on-call Slack channel
    mock: true
checklists:
  security:
    - PII fields (reporter_email) marked sensitive
    - Approval gate enforces manager/director role
  logging:
    - All form submissions are logged with timestamp
    - Approval decisions are audit-logged
  schema:
    - Form fields validated against spec ComponentBaseSchema
    - Manifest validates against BlueprintManifestSchema
  mocks:
    - demo-data/incident-p1.json provides a critical incident scenario
    - demo-data/incident-p3.json provides a low-severity scenario
  docs:
    - README.md covers usage, components, and integration points
```

### Manifest Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Blueprint identifier (kebab-case) |
| `version` | string | yes | Semantic version |
| `maturity` | enum | yes | `experimental`, `stable`, or `enterprise-ready` |
| `description` | string | yes | What this blueprint does |
| `outcome` | string | yes | What the user gets from using it |
| `domain` | string | yes | Business domain (e.g., `finance`, `critical-ops`, `engineering`) |
| `components_used` | string[] | yes | List of MDMA component types used |
| `integrations` | array | no | External services the blueprint connects to |
| `checklists` | object | no | Verification checklists for security, logging, schema, mocks, docs |

### Maturity Levels

- **experimental** -- Early stage, API may change. Suitable for prototyping.
- **stable** -- API is stable, tested, with documentation. Suitable for production pilot.
- **enterprise-ready** -- Full compliance checklists, audit logging, PII handling, and integration mocks verified.

### Integrations

Each integration entry describes an external service:

```yaml
integrations:
  - name: slack
    type: webhook
    description: Post alerts to Slack
    mock: true
  - name: identity-verification-api
    type: rest
    description: Third-party ID verification service
    mock: true
```

The `mock: true` flag indicates the integration uses placeholder responses during development. Production deployments should set `mock: false` and configure real endpoints.

## Writing the Document

The `document.md` file is a standard MDMA document. Structure it with clear sections:

````markdown
# Incident Triage

Structured incident response workflow.

---

## Severity Alert

```mdma
id: severity-alert
type: callout
variant: warning
title: Incident Classification Required
content: >
  All production incidents must be classified within 15 minutes.
```

## Incident Details

```mdma
id: incident-form
type: form
fields:
  - name: incident_title
    type: text
    label: Incident Title
    required: true
  - name: reporter_email
    type: email
    label: Reporter Email
    required: true
    sensitive: true
  - name: severity
    type: select
    label: Severity Level
    required: true
    options:
      - { label: "P1 - Critical", value: P1 }
      - { label: "P2 - High", value: P2 }
      - { label: "P3 - Medium", value: P3 }
      - { label: "P4 - Low", value: P4 }
onSubmit: submit-incident
```

## Response Checklist

```mdma
id: response-checklist
type: tasklist
items:
  - id: verify-alert
    text: Verify alerting source and confirm incident
    required: true
  - id: identify-scope
    text: Identify blast radius and affected customers
    required: true
  - id: assign-commander
    text: Assign incident commander
    required: true
  - id: apply-mitigation
    text: Apply mitigation or rollback
  - id: verify-resolution
    text: Verify resolution and confirm metrics recovery
    required: true
```

## Manager Sign-off

```mdma
id: manager-signoff
type: approval-gate
title: Manager Approval for Incident Closure
requiredApprovers: 1
allowedRoles:
  - manager
  - director
```
````

### Blueprint Authoring Guidelines

1. **Start with a callout** -- Set context with an info or warning callout explaining the workflow.

2. **Collect data with forms** -- Use forms for structured input. Mark PII fields `sensitive: true`.

3. **Track progress with tasklists** -- Use tasklists for step-by-step procedures. Mark critical steps `required: true`.

4. **Gate critical actions** -- Use approval gates before irreversible actions (deployments, case closures, financial approvals).

5. **Wire components with actions** -- Connect forms, buttons, and webhooks through consistent action IDs.

6. **Provide demo data** -- Include JSON files in `demo-data/` that represent realistic scenarios for development testing.

## Demo Data

Create JSON files in `demo-data/` that provide sample payloads for each scenario:

```json
// demo-data/incident-p1.json
{
  "incident_title": "API Gateway Complete Outage",
  "reporter_email": "oncall@example.com",
  "severity": "P1",
  "affected_systems": "API Gateway, Auth Service",
  "description": "All API endpoints returning 503. Customer-facing outage.",
  "start_time": "2025-12-15T03:45:00Z",
  "customer_impact": "100% of API traffic affected. All external customers impacted."
}
```

```json
// demo-data/incident-p3.json
{
  "incident_title": "Slow Dashboard Load Times",
  "reporter_email": "dev@example.com",
  "severity": "P3",
  "affected_systems": "Internal Dashboard",
  "description": "Dashboard pages taking 10+ seconds to load.",
  "start_time": "2025-12-15T09:00:00Z",
  "customer_impact": "Internal only. No external customer impact."
}
```

## Checklists

The `checklists` section documents what has been verified. This serves as a compliance artifact:

```yaml
checklists:
  security:
    - All PII fields marked sensitive
    - Approval gate enforces authorized roles
    - Data encrypted at rest and in transit
  logging:
    - All form submissions audit-logged
    - Approval decisions recorded with rationale
  schema:
    - Form fields validated against ComponentBaseSchema
    - Manifest validates against BlueprintManifestSchema
  mocks:
    - demo-data/scenario-a.json covers the happy path
    - demo-data/scenario-b.json covers an edge case
  docs:
    - README.md covers usage and integration points
```

## Validating a Blueprint

Lint the document:

```bash
npx mdma lint blueprints/my-workflow/document.md
```

Validate the manifest programmatically:

```typescript
import { BlueprintManifestSchema } from '@mdma/spec';
import { readFileSync } from 'fs';
import { parse } from 'yaml';

const raw = readFileSync('blueprints/my-workflow/manifest.yaml', 'utf-8');
const manifest = BlueprintManifestSchema.parse(parse(raw));
```

## Existing Blueprints

Study the existing blueprints for patterns:

| Blueprint | Domain | Key Pattern |
|-----------|--------|-------------|
| `incident-triage` | Critical Ops | Form + tasklist + approval gate for incident lifecycle |
| `kyc-case` | Finance | PII-heavy form + document verification checklist + compliance approval |
| `clinical-ops` | Healthcare | Procedure form + safety checklist + clinical approval gate |
| `customer-escalation` | Support | Escalation form + SLA tracking + notification button |
| `change-management` | Engineering | Change request form + dual approval + pre-deployment checklist |
