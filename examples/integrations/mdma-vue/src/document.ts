/**
 * The MDMA document this demo renders. It's an ordinary Markdown string with
 * fenced `mdma` blocks — the kind of thing an LLM emits — exercising a form
 * (incl. a sensitive field and a data-source select), a table with a masked
 * column, an approval gate, a callout, and a submit button.
 */
export const SAMPLE_DOCUMENT = `# New Vendor Onboarding

Fill in the vendor's details, review the flagged records, then request sign-off.

\`\`\`mdma
type: form
id: vendor
label: "Vendor details"
fields:
  - name: company
    type: text
    label: "Company name"
    required: true
  - name: contact_email
    type: email
    label: "Contact email"
    required: true
  - name: tax_id
    type: text
    label: "Tax ID"
    sensitive: true
  - name: region
    type: select
    label: "Region"
    options: regions
  - name: notes
    type: textarea
    label: "Notes"
onSubmit: submit-vendor
\`\`\`

## Flagged records

\`\`\`mdma
type: table
id: flags
label: "Open compliance flags"
columns:
  - key: ref
    header: "Ref"
  - key: kind
    header: "Kind"
  - key: account
    header: "Account #"
    sensitive: true
data:
  - ref: "F-1042"
    kind: "Sanctions match"
    account: "9981-2210"
  - ref: "F-1043"
    kind: "Missing W-9"
    account: "9981-4457"
\`\`\`

\`\`\`mdma
type: callout
id: reminder
variant: warning
title: "Before you approve"
content: "Sign-off is recorded to the audit log with your identity attached."
dismissible: true
\`\`\`

## Sign-off

\`\`\`mdma
type: approval-gate
id: gate
title: "Compliance sign-off"
description: "Approve only once both flags are resolved."
\`\`\`

\`\`\`mdma
type: button
id: submit
text: "Submit onboarding"
variant: primary
onAction: submit-vendor
\`\`\`
`;

/** Named option lists the form's select fields reference by string. */
export const DATA_SOURCES = {
  regions: [
    { label: 'North America', value: 'na' },
    { label: 'Europe', value: 'eu' },
    { label: 'Asia-Pacific', value: 'apac' },
  ],
};
