# Change Management Blueprint

**Domain:** engineering
**Maturity:** experimental
**Version:** 0.1.0

## Overview

Release and change approval workflow designed for SOX Section 404 and ISO 27001 compliance. This blueprint enforces separation of duties through dual approval gates, documents risk assessment, tracks pre-deployment verification, and maintains a complete audit trail for every production change.

## Components

| Component | ID | Purpose |
|---|---|---|
| callout | `risk-assessment-callout` | Warns about risk assessment and SOX compliance requirements |
| form | `change-request-form` | Captures change details, risk level, rollback plan, and test evidence |
| tasklist | `pre-deployment-checklist` | Tracks CI/CD, testing, security, monitoring, and rollback readiness |
| approval-gate | `tech-lead-approval` | Requires tech lead / staff engineer sign-off (technical review) |
| approval-gate | `manager-approval` | Requires engineering manager sign-off (business authorization) |

## Form Fields

| Field | Type | Required | Sensitive |
|---|---|---|---|
| `change_id` | text | yes | no |
| `jira_ticket` | text | yes | no |
| `change_title` | text | yes | no |
| `change_type` | select | yes | no |
| `requestor_name` | text | yes | no |
| `requestor_team` | text | yes | no |
| `environment` | select | yes | no |
| `scheduled_date` | datetime | yes | no |
| `change_description` | textarea | yes | no |
| `business_justification` | textarea | yes | no |
| `affected_services` | text | yes | no |
| `risk_level` | select | yes | no |
| `rollback_plan` | textarea | yes | no |
| `rollback_time_estimate` | text | yes | no |
| `test_evidence` | textarea | yes | no |

## Dual Approval (Separation of Duties)

SOX Section 404 requires separation of duties for production changes. This blueprint enforces:

1. **Tech Lead Approval** - A senior engineer (tech lead, staff, or principal) reviews the technical implementation, test evidence, and rollback plan.
2. **Manager Approval** - An engineering manager or director authorizes the business justification, risk acceptance, and deployment timing.

The same person cannot fulfill both approval roles.

## Change Types

| Type | Description | Approval Path |
|---|---|---|
| Standard | Pre-approved, low-risk, routine | Dual approval (may be expedited) |
| Normal | Requires full review and approval | Full dual approval + complete checklist |
| Emergency | Critical fix, expedited process | Dual approval (may be concurrent), CAB notified retroactively |

## Demo Data

- `demo-data/change-standard.json` - Redis cluster upgrade, normal change, tech lead approved (pending manager)
- `demo-data/change-emergency.json` - OAuth security patch, emergency change, fully approved

## Integrations

- **JIRA** (mocked) - Change ticket linking and status synchronization
- **CI/CD Pipeline** (mocked) - Automated deployment trigger upon approval
- **Audit Log Service** (mocked) - Centralized SOX compliance evidence

## Compliance Mapping

| Requirement | How This Blueprint Addresses It |
|---|---|
| SOX 404 - Separation of Duties | Dual approval gates (tech lead + manager) |
| SOX 404 - Change Authorization | Approval gates with role-based access |
| ISO 27001 - A.12.1.2 Change Management | Structured change request with risk assessment |
| ISO 27001 - A.14.2.2 Change Control | Pre-deployment checklist and test evidence |

## Usage

Load `document.md` in an MDMA-compatible renderer. The workflow proceeds as:

1. Risk assessment callout alerts to SOX/ISO requirements
2. Requestor fills in the change request form with full details
3. Requestor completes the pre-deployment checklist
4. Tech lead reviews and approves (technical sign-off)
5. Manager reviews and approves (business authorization)
6. CI/CD pipeline is triggered for authorized deployment
