# Q1 Sales Report

Quarterly sales performance overview with revenue trends, team breakdown, and pipeline status.

---

```mdma
id: quarter-summary
type: callout
variant: success
title: "Q1 2024 — Target Exceeded"
content: >
  Total revenue: $2.34M (target: $2.1M, 111% attainment).
  12 new enterprise deals closed. Net retention rate: 118%.
```

## Monthly Revenue Trend

```mdma
id: revenue-trend
type: chart
variant: line
label: Monthly Revenue ($)
data: |
  Month, Revenue, Target
  January, 720000, 700000
  February, 780000, 700000
  March, 840000, 700000
xAxis: Month
```

## Revenue by Product Line

```mdma
id: product-revenue
type: chart
variant: bar
label: Revenue by Product
data: |
  Product, Q1 Revenue
  Platform, 980000
  Analytics, 640000
  Integrations, 420000
  Professional Services, 300000
xAxis: Product
stacked: false
```

## Deal Size Distribution

```mdma
id: deal-distribution
type: chart
variant: pie
label: Deals by Size
data: |
  Size, Count
  Enterprise (>$100K), 12
  Mid-Market ($25K-$100K), 28
  SMB (<$25K), 45
xAxis: Size
```

## Top Deals

```mdma
id: top-deals
type: table
sortable: true
columns:
  - key: company
    header: Company
    sortable: true
  - key: deal_size
    header: Deal Size
    sortable: true
  - key: product
    header: Product
    sortable: true
  - key: stage
    header: Stage
    sortable: true
  - key: rep
    header: Sales Rep
    sortable: true
data:
  - { company: "TechCorp Inc.", deal_size: "$285,000", product: "Platform", stage: "Closed Won", rep: "Sarah Chen" }
  - { company: "GlobalBank", deal_size: "$210,000", product: "Analytics", stage: "Closed Won", rep: "Mike Johnson" }
  - { company: "HealthFirst", deal_size: "$175,000", product: "Platform", stage: "Closed Won", rep: "Sarah Chen" }
  - { company: "RetailMax", deal_size: "$150,000", product: "Integrations", stage: "Negotiation", rep: "Alex Rivera" }
  - { company: "EduLearn", deal_size: "$125,000", product: "Platform", stage: "Proposal", rep: "Lisa Park" }
  - { company: "AutoDrive", deal_size: "$98,000", product: "Analytics", stage: "Closed Won", rep: "Mike Johnson" }
```

## Pipeline Review Checklist

```mdma
id: pipeline-review
type: tasklist
items:
  - id: update-forecast
    text: Update Q2 forecast in CRM
    required: true
  - id: review-lost
    text: Review lost deals and document reasons
    required: true
  - id: territory-plan
    text: Finalize Q2 territory assignments
    required: true
  - id: commission-calc
    text: Submit commission calculations to finance
    required: true
  - id: qbr-deck
    text: Prepare QBR presentation for leadership
    required: true
onComplete: review-complete
```

---

Q2 pipeline currently stands at $3.8M with 65% weighted coverage against the $2.3M target.
