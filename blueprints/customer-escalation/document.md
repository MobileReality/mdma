# Customer Escalation

Track and resolve customer escalations with SLA timers, structured resolution steps, and clear escalation paths.

---

## SLA Warning

```mdma
id: sla-warning
type: callout
variant: warning
title: SLA Compliance Required
body: >
  All escalations must be acknowledged within 1 hour and resolved within
  the SLA window for their priority tier. P1: 4 hours, P2: 8 hours,
  P3: 24 hours, P4: 72 hours. SLA breaches trigger automatic manager
  notification.
```

## Escalation Details

```mdma
id: escalation-form
type: form
fields:
  - name: case_id
    type: text
    label: Case / Ticket ID
    required: true
  - name: customer_name
    type: text
    label: Customer Name
    required: true
  - name: customer_email
    type: email
    label: Customer Email
    required: true
    sensitive: true
  - name: customer_phone
    type: text
    label: Customer Phone
    sensitive: true
  - name: account_id
    type: text
    label: Account ID
    required: true
    sensitive: true
  - name: priority
    type: select
    label: Escalation Priority
    required: true
    options:
      - { label: "P1 - Critical (SLA: 4h)", value: P1 }
      - { label: "P2 - High (SLA: 8h)", value: P2 }
      - { label: "P3 - Medium (SLA: 24h)", value: P3 }
      - { label: "P4 - Low (SLA: 72h)", value: P4 }
  - name: category
    type: select
    label: Escalation Category
    required: true
    options:
      - { label: Billing / Charges Dispute, value: billing }
      - { label: Service Outage, value: outage }
      - { label: Feature Request, value: feature }
      - { label: Data / Privacy Concern, value: privacy }
      - { label: Account Access Issue, value: access }
      - { label: Contract / Legal, value: legal }
      - { label: Other, value: other }
  - name: escalation_reason
    type: textarea
    label: Escalation Reason
    required: true
  - name: previous_attempts
    type: textarea
    label: Previous Resolution Attempts
  - name: customer_sentiment
    type: select
    label: Customer Sentiment
    required: true
    options:
      - { label: Satisfied - Willing to wait, value: satisfied }
      - { label: Frustrated - Needs prompt attention, value: frustrated }
      - { label: Angry - At risk of churn, value: angry }
      - { label: Threatening - Legal/social media threat, value: threatening }
  - name: escalated_at
    type: datetime
    label: Escalation Timestamp
    required: true
onSubmit: submit-escalation
```

## Resolution Steps

```mdma
id: resolution-steps
type: tasklist
items:
  - id: acknowledge-customer
    text: Acknowledge escalation to customer within 1 hour
    required: true
  - id: review-history
    text: Review full case history and previous interactions
    required: true
  - id: reproduce-issue
    text: Reproduce or verify the reported issue
  - id: identify-root-cause
    text: Identify root cause or responsible team
    required: true
  - id: propose-resolution
    text: Propose resolution to customer
    required: true
  - id: implement-fix
    text: Implement fix or workaround
  - id: apply-credit
    text: Apply account credit or compensation (if applicable)
  - id: customer-confirmation
    text: Obtain customer confirmation of resolution
    required: true
  - id: update-knowledge-base
    text: Update knowledge base with resolution
  - id: close-case
    text: Close case with resolution summary
    required: true
```

## Escalate to Manager

```mdma
id: escalate-manager-btn
type: button
text: Escalate to Manager
variant: danger
onAction: escalate-to-manager
```

## Escalation History Log

```mdma
id: history-log
type: table
columns:
  - key: timestamp
    header: Timestamp
  - key: action
    header: Action
  - key: agent
    header: Agent
  - key: notes
    header: Notes
data: "{{escalation_history}}"
```

---

Once the customer confirms resolution and the case is closed, the escalation is archived with its full history for quality review.
