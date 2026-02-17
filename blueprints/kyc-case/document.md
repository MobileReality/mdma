# KYC Case Review

Customer identity verification workflow for KYC/AML compliance. Collect customer data, verify documents, and obtain compliance approval.

---

## Customer Information

```mdma
id: customer-info-form
type: form
fields:
  - name: case_id
    type: text
    label: Case Reference ID
    required: true
  - name: customer_type
    type: select
    label: Customer Type
    required: true
    options:
      - { label: Individual, value: individual }
      - { label: Business Entity, value: business }
      - { label: Trust / Foundation, value: trust }
  - name: full_name
    type: text
    label: Full Legal Name
    required: true
    sensitive: true
  - name: date_of_birth
    type: date
    label: Date of Birth
    required: true
    sensitive: true
  - name: nationality
    type: text
    label: Nationality
    required: true
  - name: ssn_or_tax_id
    type: text
    label: SSN / Tax Identification Number
    required: true
    sensitive: true
  - name: email
    type: email
    label: Email Address
    required: true
    sensitive: true
  - name: phone
    type: text
    label: Phone Number
    required: true
    sensitive: true
  - name: residential_address
    type: textarea
    label: Residential Address
    required: true
    sensitive: true
  - name: source_of_funds
    type: select
    label: Source of Funds
    required: true
    options:
      - { label: Employment Income, value: employment }
      - { label: Business Revenue, value: business }
      - { label: Investment Returns, value: investment }
      - { label: Inheritance, value: inheritance }
      - { label: Other, value: other }
  - name: risk_rating
    type: select
    label: Initial Risk Rating
    required: true
    options:
      - { label: Low Risk, value: low }
      - { label: Medium Risk, value: medium }
      - { label: High Risk, value: high }
      - { label: Prohibited, value: prohibited }
onSubmit: submit-customer-info
```

## Verification Documents

```mdma
id: document-table
type: table
columns:
  - key: document_type
    header: Document Type
  - key: document_id
    header: Document ID
  - key: issued_by
    header: Issuing Authority
  - key: expiry_date
    header: Expiry Date
  - key: verification_status
    header: Status
data: "{{verification_documents}}"
```

## Verification Checklist

```mdma
id: verification-checklist
type: tasklist
items:
  - id: id-document-check
    text: Government-issued photo ID verified (passport or national ID)
    required: true
  - id: proof-of-address
    text: Proof of address verified (utility bill or bank statement, < 3 months old)
    required: true
  - id: sanctions-screening
    text: Sanctions list screening completed (OFAC, EU, UN)
    required: true
  - id: pep-screening
    text: Politically Exposed Person (PEP) screening completed
    required: true
  - id: adverse-media
    text: Adverse media screening completed
  - id: source-of-funds
    text: Source of funds documentation reviewed
    required: true
  - id: beneficial-ownership
    text: Beneficial ownership structure verified (if business entity)
  - id: risk-assessment
    text: Risk assessment score calculated and documented
    required: true
  - id: enhanced-due-diligence
    text: Enhanced Due Diligence completed (if high-risk)
```

## Compliance Approval

```mdma
id: compliance-approval
type: approval-gate
title: Compliance Officer Sign-off
requiredApprovers: 1
allowedRoles:
  - compliance-officer
  - compliance-manager
  - chief-compliance-officer
```

---

Once approved by the compliance officer, this KYC case is marked as verified and the customer is cleared for onboarding.
