# Feature Request

Submit a product feature request with business justification and priority assessment.

---

```mdma
id: process-note
type: callout
variant: info
title: Feature Request Process
content: >
  All feature requests go through product review. Requests with strong business
  justification and customer impact data are prioritized. Average review time: 5 business days.
dismissible: true
```

## Request Details

```mdma
id: feature-form
type: form
fields:
  - name: title
    type: text
    label: Feature Title
    required: true
  - name: requester
    type: text
    label: Requester Name
    required: true
  - name: requester_email
    type: email
    label: Requester Email
    required: true
    sensitive: true
  - name: team
    type: select
    label: Requesting Team
    required: true
    options:
      - { label: Engineering, value: engineering }
      - { label: Sales, value: sales }
      - { label: Customer Success, value: cs }
      - { label: Marketing, value: marketing }
      - { label: Product, value: product }
      - { label: Operations, value: ops }
  - name: priority
    type: select
    label: Requested Priority
    required: true
    options:
      - { label: "Critical — blocking revenue or retention", value: critical }
      - { label: "High — significant customer impact", value: high }
      - { label: "Medium — nice to have, moderate impact", value: medium }
      - { label: "Low — minor improvement", value: low }
  - name: description
    type: textarea
    label: Feature Description
    required: true
  - name: use_case
    type: textarea
    label: Primary Use Case
    required: true
  - name: customer_impact
    type: textarea
    label: Customer Impact (who benefits and how?)
    required: true
  - name: revenue_impact
    type: select
    label: Estimated Revenue Impact
    options:
      - { label: ">$500K ARR", value: "500k+" }
      - { label: "$100K-$500K ARR", value: "100k-500k" }
      - { label: "$10K-$100K ARR", value: "10k-100k" }
      - { label: "<$10K ARR", value: "<10k" }
      - { label: "Not directly revenue-tied", value: "none" }
  - name: alternatives
    type: textarea
    label: Alternatives Considered
onSubmit: submit-feature
```

## Evaluation Criteria

```mdma
id: eval-checklist
type: tasklist
items:
  - id: customer-validated
    text: Feature validated with at least 3 customers
  - id: competitive-analysis
    text: Competitive analysis completed
  - id: technical-feasibility
    text: Technical feasibility reviewed with engineering
    required: true
  - id: design-mockup
    text: Design mockup or wireframe attached
  - id: metrics-defined
    text: Success metrics defined
    required: true
  - id: no-duplicate
    text: Confirmed no duplicate request exists
    required: true
onComplete: evaluation-done
```

## Product Review

```mdma
id: product-review
type: approval-gate
title: Product Manager Review
description: Product manager reviews the request for roadmap alignment and feasibility.
requiredApprovers: 1
allowedRoles:
  - product-manager
  - head-of-product
  - cto
onApprove: feature-approved
onDeny: feature-declined
requireReason: true
```

## Submit Request

```mdma
id: submit-feature-btn
type: button
text: Submit Feature Request
variant: primary
onAction: submit-feature
```

---

Approved features are added to the product roadmap. You'll receive status updates as the feature progresses through design, development, and release.
