# Incident Triage

## Assessment

```mdma
id: triage-form
type: form
fields:
  - name: summary
    type: text
    label: Incident Summary
    required: true
  - name: severity
    type: select
    label: Severity Level
    options:
      - { label: P1 - Critical, value: P1 }
      - { label: P2 - High, value: P2 }
```

## Checklist

```mdma
id: triage-checklist
type: tasklist
items:
  - id: check-logs
    text: Check application logs
  - id: check-metrics
    text: Review dashboards and metrics
  - id: notify-oncall
    text: Notify on-call engineer
    required: true
```

## Approval

```mdma
id: manager-approval
type: approval-gate
title: Manager Sign-off
requiredApprovers: 1
allowedRoles:
  - manager
  - director
```

## Actions

```mdma
id: notify-slack
type: button
text: Notify Slack Channel
variant: primary
onAction: send-slack-notification
```
