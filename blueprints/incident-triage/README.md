# Incident Triage Blueprint

**Domain:** critical-ops
**Maturity:** experimental
**Version:** 0.1.0

## Overview

Structured incident response workflow for production systems. This blueprint guides responders through severity assessment, stakeholder notification, resolution tracking, and manager sign-off before an incident can be closed.

## Components

| Component | ID | Purpose |
|---|---|---|
| callout | `severity-alert` | Warns that classification is required within 15 minutes |
| form | `incident-form` | Captures incident details, severity, affected systems, and impact |
| tasklist | `response-checklist` | Tracks required response actions from verification to post-mortem |
| button | `notify-slack-btn` | Triggers Slack webhook to notify the on-call channel |
| approval-gate | `manager-signoff` | Requires manager/director approval before incident closure |

## Form Fields

| Field | Type | Required | Sensitive |
|---|---|---|---|
| `incident_title` | text | yes | no |
| `reporter_name` | text | yes | no |
| `reporter_email` | email | yes | yes |
| `severity` | select (P1-P4) | yes | no |
| `affected_systems` | text | yes | no |
| `description` | textarea | yes | no |
| `start_time` | date | yes | no |
| `customer_impact` | textarea | no | no |

## Demo Data

- `demo-data/incident-p1.json` - Critical payment gateway outage (P1)
- `demo-data/incident-p3.json` - Staging pipeline issue (P3)

## Integrations

- **Slack webhook** (mocked) - Posts incident alerts to the on-call channel

## Usage

Load `document.md` in an MDMA-compatible renderer. The workflow proceeds as:

1. Responder fills in the incident form with severity classification
2. Severity alert callout reminds of the 15-minute SLA
3. Responder works through the response checklist
4. Stakeholders are notified via the Slack button
5. Manager signs off on the approval gate to close the incident
