# Clinical Procedure Approval

Procedure publish and change approval workflow. All clinical procedures must undergo clinical review, QA review, and safety verification before publication.

---

## Safety Notice

```mdma
id: safety-notice
type: callout
variant: danger
title: Patient Safety - Critical Review Required
content: >
  This procedure directly impacts patient care. All reviewers must verify
  clinical accuracy, contraindication documentation, and alignment with
  current evidence-based guidelines before approving. Changes to published
  procedures require full re-review.
```

## Procedure Metadata

```mdma
id: procedure-form
type: form
fields:
  - name: procedure_id
    type: text
    label: Procedure ID
    required: true
  - name: procedure_title
    type: text
    label: Procedure Title
    required: true
  - name: change_type
    type: select
    label: Change Type
    required: true
    options:
      - { label: New Procedure, value: new }
      - { label: Major Revision, value: major-revision }
      - { label: Minor Revision, value: minor-revision }
      - { label: Retirement, value: retirement }
  - name: department
    type: select
    label: Department
    required: true
    options:
      - { label: Surgery, value: surgery }
      - { label: Internal Medicine, value: internal-medicine }
      - { label: Emergency Medicine, value: emergency }
      - { label: Radiology, value: radiology }
      - { label: Pharmacy, value: pharmacy }
      - { label: Nursing, value: nursing }
  - name: author_name
    type: text
    label: Author / Submitter
    required: true
  - name: author_credentials
    type: text
    label: Author Credentials (e.g., MD, RN, PharmD)
    required: true
  - name: effective_date
    type: date
    label: Proposed Effective Date
    required: true
  - name: supersedes
    type: text
    label: Supersedes Procedure ID (if revision)
  - name: clinical_summary
    type: textarea
    label: Clinical Summary
    required: true
  - name: contraindications
    type: textarea
    label: Contraindications and Warnings
    required: true
  - name: evidence_references
    type: textarea
    label: Evidence-Based References (citations)
    required: true
  - name: risk_category
    type: select
    label: Risk Category
    required: true
    options:
      - { label: Low - Minimal patient risk, value: low }
      - { label: Medium - Moderate patient risk, value: medium }
      - { label: High - Significant patient risk, value: high }
      - { label: Critical - Life-threatening implications, value: critical }
onSubmit: submit-procedure
```

## Review Checklist

```mdma
id: review-checklist
type: tasklist
items:
  - id: clinical-accuracy
    text: Clinical content reviewed for medical accuracy
    required: true
  - id: evidence-based
    text: Procedure aligns with current evidence-based guidelines
    required: true
  - id: contraindications-complete
    text: All known contraindications documented
    required: true
  - id: drug-interactions
    text: Drug interactions and allergies addressed (if applicable)
  - id: equipment-verified
    text: Required equipment and supplies listed and available
    required: true
  - id: competency-requirements
    text: Staff competency and training requirements defined
    required: true
  - id: patient-consent
    text: Patient consent requirements specified
    required: true
  - id: regulatory-alignment
    text: Regulatory and accreditation requirements verified
    required: true
  - id: formatting-standards
    text: Document formatting meets institutional standards
  - id: cross-references
    text: Cross-references to related procedures verified
```

## Clinical Review Approval

```mdma
id: clinical-review
type: approval-gate
title: Clinical Review Sign-off
requiredApprovers: 1
allowedRoles:
  - attending-physician
  - department-chief
  - medical-director
```

## QA Review Approval

```mdma
id: qa-review
type: approval-gate
title: Quality Assurance Review Sign-off
requiredApprovers: 1
allowedRoles:
  - qa-specialist
  - qa-manager
  - chief-quality-officer
```

---

Once both clinical review and QA review approvals are obtained, this procedure is cleared for publication and staff notification.
