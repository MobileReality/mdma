# Clinical Ops Blueprint

**Domain:** healthcare
**Maturity:** experimental
**Version:** 0.1.0

## Overview

Clinical procedure publish and change approval workflow. This blueprint ensures all clinical procedures undergo structured review with both clinical and QA sign-off before publication, maintaining patient safety standards and regulatory compliance.

## Components

| Component | ID | Purpose |
|---|---|---|
| callout | `safety-notice` | Danger-level alert emphasizing patient safety review requirements |
| form | `procedure-form` | Captures procedure metadata, clinical summary, contraindications |
| tasklist | `review-checklist` | Tracks clinical accuracy, evidence alignment, and regulatory checks |
| approval-gate | `clinical-review` | Requires attending physician / department chief sign-off |
| approval-gate | `qa-review` | Requires QA specialist / QA manager sign-off |

## Form Fields

| Field | Type | Required | Sensitive |
|---|---|---|---|
| `procedure_id` | text | yes | no |
| `procedure_title` | text | yes | no |
| `change_type` | select | yes | no |
| `department` | select | yes | no |
| `author_name` | text | yes | no |
| `author_credentials` | text | yes | no |
| `effective_date` | date | yes | no |
| `supersedes` | text | no | no |
| `clinical_summary` | textarea | yes | no |
| `contraindications` | textarea | yes | no |
| `evidence_references` | textarea | yes | no |
| `risk_category` | select | yes | no |

## Dual Approval Gates

This blueprint enforces dual approval:

1. **Clinical Review** - A licensed clinician (attending physician, department chief, or medical director) must verify medical accuracy and patient safety.
2. **QA Review** - A quality assurance specialist must verify formatting, cross-references, and institutional compliance.

Both approvals are required before the procedure can be published.

## Demo Data

- `demo-data/procedure-new.json` - New emergency department CVC insertion procedure (high risk)
- `demo-data/procedure-update.json` - Insulin protocol major revision with one approval already obtained

## Integrations

- **EHR System** (mocked) - Cross-references existing procedures in the electronic health record
- **Regulatory Database** (mocked) - FDA/EMA regulatory guidance lookup

## Usage

Load `document.md` in an MDMA-compatible renderer. The workflow proceeds as:

1. Safety notice callout alerts reviewers to patient safety implications
2. Author fills in procedure metadata, clinical summary, and contraindications
3. Reviewers work through the review checklist
4. Clinical reviewer (physician) approves via the clinical review gate
5. QA reviewer approves via the QA review gate
6. Procedure is cleared for publication
