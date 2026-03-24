# Bug Report

Report and track software bugs with structured reproduction steps and severity classification.

---

```mdma
id: severity-notice
type: callout
variant: error
title: Critical Bugs
content: >
  If this bug causes data loss, security vulnerability, or complete service outage,
  also notify the on-call engineer via PagerDuty immediately.
dismissible: true
```

## Bug Details

```mdma
id: bug-form
type: form
fields:
  - name: title
    type: text
    label: Bug Title
    required: true
  - name: reporter_email
    type: email
    label: Reporter Email
    required: true
    sensitive: true
  - name: severity
    type: select
    label: Severity
    required: true
    options:
      - { label: "P0 - Critical (service down)", value: p0 }
      - { label: "P1 - High (major feature broken)", value: p1 }
      - { label: "P2 - Medium (workaround exists)", value: p2 }
      - { label: "P3 - Low (cosmetic / minor)", value: p3 }
  - name: component
    type: select
    label: Affected Component
    required: true
    options:
      - { label: Frontend, value: frontend }
      - { label: Backend API, value: backend }
      - { label: Database, value: database }
      - { label: Authentication, value: auth }
      - { label: Payments, value: payments }
      - { label: Infrastructure, value: infra }
      - { label: Mobile App, value: mobile }
  - name: environment
    type: select
    label: Environment
    required: true
    options:
      - { label: Production, value: production }
      - { label: Staging, value: staging }
      - { label: Development, value: development }
  - name: steps_to_reproduce
    type: textarea
    label: Steps to Reproduce
    required: true
  - name: expected_behavior
    type: textarea
    label: Expected Behavior
    required: true
  - name: actual_behavior
    type: textarea
    label: Actual Behavior
    required: true
  - name: browser_os
    type: text
    label: Browser / OS
onSubmit: submit-bug
```

## Triage Checklist

```mdma
id: triage-checklist
type: tasklist
items:
  - id: reproduced
    text: Bug reproduced by a second engineer
    required: true
  - id: logs-attached
    text: Relevant logs and stack traces attached
    required: true
  - id: assigned
    text: Assigned to responsible team
    required: true
  - id: timeline-set
    text: Fix timeline communicated
  - id: workaround-documented
    text: Workaround documented (if available)
onComplete: triage-done
```

## Submit Report

```mdma
id: submit-bug-btn
type: button
text: Submit Bug Report
variant: primary
onAction: submit-bug
confirm:
  title: Submit Bug Report
  message: This will create a ticket and notify the responsible team. Continue?
  confirmText: Submit
  cancelText: Cancel
```

---

After submission, the bug is tracked in the backlog and the responsible team is notified.
