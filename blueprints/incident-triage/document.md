# Incident Triage

Structured incident response workflow. Assess severity, notify stakeholders, track resolution, and obtain manager sign-off before closure.

---

## Severity Alert

```mdma
id: severity-alert
type: callout
variant: warning
title: Incident Classification Required
content: >
  All production incidents must be classified within 15 minutes of detection.
  P1/P2 incidents trigger automatic stakeholder notification.
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
  - name: reporter_name
    type: text
    label: Reporter Name
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
      - { label: "P1 - Critical (customer-facing outage)", value: P1 }
      - { label: "P2 - High (degraded service)", value: P2 }
      - { label: "P3 - Medium (internal impact)", value: P3 }
      - { label: "P4 - Low (cosmetic / minor)", value: P4 }
  - name: affected_systems
    type: text
    label: Affected Systems
    required: true
  - name: description
    type: textarea
    label: Incident Description
    required: true
  - name: start_time
    type: date
    label: Incident Start Time
    required: true
  - name: customer_impact
    type: textarea
    label: Customer Impact Assessment
onSubmit: submit-incident
```

## Response Checklist

```mdma
id: response-checklist
type: tasklist
items:
  - id: verify-alert
    text: Verify alerting source and confirm incident is real
    required: true
  - id: check-dashboards
    text: Review monitoring dashboards and error rates
    required: true
  - id: identify-scope
    text: Identify blast radius and affected customers
    required: true
  - id: assign-commander
    text: Assign incident commander
    required: true
  - id: open-bridge
    text: Open incident bridge / war room
  - id: engage-oncall
    text: Page on-call engineers for affected services
  - id: customer-comms
    text: Draft customer communication (if P1/P2)
  - id: apply-mitigation
    text: Apply mitigation or rollback
  - id: verify-resolution
    text: Verify resolution and confirm metrics recovery
    required: true
  - id: write-postmortem
    text: Schedule or draft post-mortem
```

## Stakeholder Notification

```mdma
id: notify-slack-btn
type: button
text: Notify Slack Channel
variant: primary
onAction: send-slack-notification
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
  - vp-engineering
```

---

Once the manager has signed off, this incident is marked as resolved and archived for post-mortem review.
