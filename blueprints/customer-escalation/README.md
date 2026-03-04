# Customer Escalation Blueprint

**Domain:** customer-ops
**Maturity:** experimental
**Version:** 0.1.0

## Overview

Customer escalation workflow with SLA timers and escalation paths. This blueprint tracks escalation details, guides agents through structured resolution steps, provides manager escalation capability, monitors SLA compliance, and maintains a complete audit trail.

## Components

| Component | ID | Purpose |
|---|---|---|
| callout | `sla-warning` | Displays SLA windows by priority tier |
| form | `escalation-form` | Captures escalation details, customer info, priority, and sentiment |
| tasklist | `resolution-steps` | Tracks resolution from acknowledgment through case closure |
| button | `escalate-manager-btn` | Triggers manager escalation via PagerDuty |
| table | `history-log` | Displays chronological escalation history with agent actions |

## Form Fields

| Field | Type | Required | Sensitive |
|---|---|---|---|
| `case_id` | text | yes | no |
| `customer_name` | text | yes | no |
| `customer_email` | email | yes | yes |
| `customer_phone` | text | no | yes |
| `account_id` | text | yes | yes |
| `priority` | select (P1-P4) | yes | no |
| `category` | select | yes | no |
| `escalation_reason` | textarea | yes | no |
| `previous_attempts` | textarea | no | no |
| `customer_sentiment` | select | yes | no |
| `escalated_at` | date | yes | no |

## SLA Tiers

| Priority | Acknowledge | Resolve | Auto-Escalate |
|---|---|---|---|
| P1 - Critical | 15 min | 4 hours | After 2 hours |
| P2 - High | 30 min | 8 hours | After 4 hours |
| P3 - Medium | 1 hour | 24 hours | After 12 hours |
| P4 - Low | 4 hours | 72 hours | After 48 hours |

## Demo Data

- `demo-data/escalation-billing.json` - Billing dispute with angry customer, refund failed (P2)
- `demo-data/escalation-outage.json` - Enterprise customer API outage, threatening churn (P1)

## Integrations

- **CRM System** (mocked) - Customer record lookup and case linking
- **PagerDuty** (mocked) - Manager escalation alerts

## Usage

Load `document.md` in an MDMA-compatible renderer. The workflow proceeds as:

1. SLA warning callout displays response time requirements
2. Agent fills in escalation details and customer information
3. Agent works through resolution steps checklist
4. If needed, agent escalates to manager via the escalate button
5. History log tracks all actions taken on the escalation
6. Customer confirms resolution and case is closed
