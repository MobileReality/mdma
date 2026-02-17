# KYC Case Blueprint

**Domain:** finance
**Maturity:** experimental
**Version:** 0.1.0

## Overview

Know Your Customer (KYC) and Anti-Money Laundering (AML) verification workflow. This blueprint guides compliance analysts through structured customer identity verification, document validation, sanctions screening, and compliance officer approval.

## Components

| Component | ID | Purpose |
|---|---|---|
| form | `customer-info-form` | Captures customer identity data with PII protection |
| table | `document-table` | Displays verification documents and their status |
| tasklist | `verification-checklist` | Tracks all required verification steps |
| approval-gate | `compliance-approval` | Requires compliance officer sign-off |

## Form Fields

| Field | Type | Required | Sensitive |
|---|---|---|---|
| `case_id` | text | yes | no |
| `customer_type` | select | yes | no |
| `full_name` | text | yes | yes |
| `date_of_birth` | date | yes | yes |
| `nationality` | text | yes | no |
| `ssn_or_tax_id` | text | yes | yes |
| `email` | email | yes | yes |
| `phone` | text | yes | yes |
| `residential_address` | textarea | yes | yes |
| `source_of_funds` | select | yes | no |
| `risk_rating` | select | yes | no |

## PII Handling

This blueprint contains highly sensitive personal data. The following fields are marked `sensitive: true` and must be:
- Encrypted at rest and in transit
- Redacted in all log output
- Access-controlled to compliance team roles only
- Subject to data retention policies per jurisdiction

## Demo Data

- `demo-data/kyc-individual.json` - Standard individual customer (low risk, Spanish national)
- `demo-data/kyc-business.json` - Business entity (medium risk, Danish company)

## Integrations

- **Identity Verification API** (mocked) - Third-party document validation service
- **Sanctions Screening** (mocked) - OFAC/EU/UN sanctions list check

## Usage

Load `document.md` in an MDMA-compatible renderer. The workflow proceeds as:

1. Analyst fills in customer identity information
2. Verification documents are listed in the table
3. Analyst completes the verification checklist (sanctions, PEP, adverse media)
4. Compliance officer reviews and approves via the approval gate
5. Customer is cleared for onboarding
