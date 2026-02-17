# Change Management

Release and change approval workflow for SOX/ISO compliance. All production changes require documented risk assessment, dual approval, and pre-deployment verification.

---

## Risk Assessment Notice

```mdma
id: risk-assessment-callout
type: callout
variant: warning
title: Risk Assessment Required
content: >
  All production changes must include a documented risk assessment.
  High-risk and emergency changes require additional scrutiny and
  may need CAB (Change Advisory Board) review. SOX Section 404
  requires evidence of change authorization and separation of duties.
```

## Change Request

```mdma
id: change-request-form
type: form
fields:
  - name: change_id
    type: text
    label: Change Request ID
    required: true
  - name: jira_ticket
    type: text
    label: JIRA Ticket Reference
    required: true
  - name: change_title
    type: text
    label: Change Title
    required: true
  - name: change_type
    type: select
    label: Change Type
    required: true
    options:
      - { label: Standard - Pre-approved low-risk, value: standard }
      - { label: Normal - Requires full approval, value: normal }
      - { label: Emergency - Expedited approval, value: emergency }
  - name: requestor_name
    type: text
    label: Requestor Name
    required: true
  - name: requestor_team
    type: text
    label: Requestor Team
    required: true
  - name: environment
    type: select
    label: Target Environment
    required: true
    options:
      - { label: Production, value: production }
      - { label: Staging, value: staging }
      - { label: Pre-production, value: pre-prod }
  - name: scheduled_date
    type: date
    label: Scheduled Deployment Date
    required: true
  - name: change_description
    type: textarea
    label: Change Description
    required: true
  - name: business_justification
    type: textarea
    label: Business Justification
    required: true
  - name: affected_services
    type: text
    label: Affected Services
    required: true
  - name: risk_level
    type: select
    label: Risk Level
    required: true
    options:
      - { label: Low - No customer impact expected, value: low }
      - { label: Medium - Potential minor disruption, value: medium }
      - { label: High - Customer-facing impact likely, value: high }
      - { label: Critical - Major outage risk, value: critical }
  - name: rollback_plan
    type: textarea
    label: Rollback Plan
    required: true
  - name: rollback_time_estimate
    type: text
    label: Estimated Rollback Time
    required: true
  - name: test_evidence
    type: textarea
    label: Test Evidence (CI links, QA sign-off)
    required: true
onSubmit: submit-change-request
```

## Pre-Deployment Checklist

```mdma
id: pre-deployment-checklist
type: tasklist
items:
  - id: ci-pipeline-green
    text: CI/CD pipeline passing on all target branches
    required: true
  - id: unit-tests-pass
    text: Unit tests passing with adequate coverage (>80%)
    required: true
  - id: integration-tests-pass
    text: Integration tests passing in staging environment
    required: true
  - id: security-scan
    text: Security vulnerability scan completed (no critical/high findings)
    required: true
  - id: database-migration
    text: Database migrations tested and reversible
  - id: feature-flags
    text: Feature flags configured for gradual rollout
  - id: monitoring-alerts
    text: Monitoring dashboards and alerts configured for change
    required: true
  - id: runbook-updated
    text: Runbook updated with deployment and rollback steps
    required: true
  - id: communication-sent
    text: Stakeholder communication sent (if customer-facing)
  - id: backup-verified
    text: Database backup verified before deployment
    required: true
  - id: load-test
    text: Load testing completed (if performance-sensitive)
  - id: rollback-tested
    text: Rollback procedure tested in staging
    required: true
```

## Tech Lead Approval

```mdma
id: tech-lead-approval
type: approval-gate
title: Tech Lead Sign-off
requiredApprovers: 1
allowedRoles:
  - tech-lead
  - staff-engineer
  - principal-engineer
```

## Manager Approval

```mdma
id: manager-approval
type: approval-gate
title: Engineering Manager Sign-off
requiredApprovers: 1
allowedRoles:
  - engineering-manager
  - director-engineering
  - vp-engineering
```

---

Once both tech lead and manager approvals are obtained and the pre-deployment checklist is complete, the change is authorized for deployment. The CI/CD pipeline will be triggered automatically upon final authorization.
