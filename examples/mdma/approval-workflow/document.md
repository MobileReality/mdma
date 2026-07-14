# Budget Approval Request

Submit a budget request, complete prerequisites, and obtain manager approval before proceeding.

---

## Important Notice

```mdma
id: budget-warning
type: callout
variant: warning
title: Review Required
content: >
  All budget requests over $5,000 require director-level approval.
  Ensure all supporting documents are attached before submitting.
dismissible: false
```

## Request Details

```mdma
id: budget-form
type: form
fields:
  - name: requester_name
    type: text
    label: Requester Name
    required: true
  - name: requester_email
    type: email
    label: Requester Email
    required: true
    sensitive: true
  - name: department
    type: select
    label: Department
    required: true
    options:
      - { label: Engineering, value: engineering }
      - { label: Marketing, value: marketing }
      - { label: Operations, value: operations }
      - { label: Finance, value: finance }
  - name: amount
    type: number
    label: Requested Amount (USD)
    required: true
    validation:
      min: 1
      message: Amount must be greater than zero.
  - name: justification
    type: textarea
    label: Business Justification
    required: true
    validation:
      min: 20
      message: Please provide a detailed justification (at least 20 characters).
onSubmit: submit-budget-request
```

## Prerequisites

Complete these items before requesting approval.

```mdma
id: prereq-checklist
type: tasklist
items:
  - id: budget-code
    text: Confirm budget code and cost center
    required: true
  - id: vendor-quote
    text: Attach vendor quote or estimate
    required: true
  - id: manager-briefed
    text: Brief your direct manager verbally
    required: true
  - id: alt-options
    text: Document alternative options considered
  - id: timeline
    text: Provide expected delivery timeline
onComplete: prereqs-done
```

## Manager Approval

```mdma
id: manager-approval
type: approval-gate
title: Manager Approval
description: The budget request requires manager sign-off to proceed.
requiredApprovers: 1
allowedRoles:
  - manager
  - director
  - vp-finance
onApprove: budget-approved
onDeny: budget-denied
requireReason: true
```

## Proceed

Once approved, click below to finalize the request.

```mdma
id: finalize-btn
type: button
text: Finalize Budget Request
variant: primary
onAction: finalize-budget
confirm:
  title: Finalize Request
  message: This will lock the request and notify procurement. Continue?
  confirmText: Finalize
  cancelText: Cancel
```

---

After finalization, the request is forwarded to procurement and cannot be edited.
