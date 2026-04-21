import type { ExpectedComponent, FlowStepDefinition } from '@mobile-reality/mdma-validator';

export interface ValidatorPromptVariant {
  key: string;
  label: string;
  description: string;
  rules: string[];
  prompt: string;
}

const PREAMBLE = `You are an AI assistant for testing the MDMA validator.
Generate MDMA components with intentional issues so the validator can demonstrate its detection and auto-fix capabilities.
Generate real, useful-looking components — just with the specified intentional mistakes baked in.

CRITICAL: Every component MUST be wrapped in its own fenced code block using \`\`\`mdma and \`\`\`. Never output bare YAML without fences. Each component = one separate \`\`\`mdma block. Do NOT use --- separators between components — use separate fenced blocks instead.`;

/** All validator rule IDs (used for computing exclude lists). */
export const ALL_RULE_IDS: string[] = [
  'yaml-correctness',
  'schema-conformance',
  'duplicate-ids',
  'id-format',
  'binding-syntax',
  'binding-resolution',
  'action-references',
  'sensitive-flags',
  'required-markers',
  'thinking-block',
  'select-options',
  'placeholder-content',
  'field-name-typos',
  'table-data-keys',
  'chart-validation',
  'unreferenced-components',
  'flow-ordering',
  'expected-components',
];

export const VALIDATOR_PROMPT_VARIANTS: ValidatorPromptVariant[] = [
  {
    key: 'structure',
    label: 'Structure & YAML',
    description: 'YAML correctness, duplicate IDs, ID format, schema conformance',
    rules: ['yaml-correctness', 'schema-conformance', 'duplicate-ids', 'id-format', 'thinking-block'],
    prompt: `${PREAMBLE}

Focus ONLY on structural and YAML issues. Generate an event registration system with these exact components, each with intentional structural problems:

## Required broken components

1. \`\`\`mdma block: **form** id: \`eventForm\` (camelCase — should be kebab-case)
   - Fields:
     - event-name (text, required) — BUT omit the label
     - date (date, required) — BUT omit the label
     - category (select, label: "Category", options: [{label: "Conference", value: "conference"}, {label: "Workshop", value: "workshop"}])
   - onSubmit: registration-complete
   - Add \`---\` at the end of the mdma block (YAML document separator)

2. \`\`\`mdma block: **table** id: \`attendee_list\` (snake_case — should be kebab-case)
   - Columns:
     - name — BUT omit header
     - email — BUT omit header
     - status — BUT omit header
   - Data: 2 rows with sample attendees
   - Add \`---\` at the end of the mdma block

3. \`\`\`mdma block: **callout** id: \`notice\` variant: info
   - BUT omit the content field entirely (required field missing)

4. \`\`\`mdma block: **callout** id: \`notice\` variant: warning (DUPLICATE ID — same as #3)
   - content: "Registration closes soon."

5. \`\`\`mdma block: **button** id: \`SubmitBtn\` (PascalCase — should be kebab-case)
   - variant: primary
   - BUT omit the text field (required field missing)
   - onAction: registration-complete

6. \`\`\`mdma block: **card** id: \`event-card\` (UNKNOWN type — "card" doesn't exist)
   - title: "Event Details"
   - content: "Some event info"

Generate all 6 components with the intentional structural mistakes described above.

## Between MDMA generations

Between generating MDMA steps, the user may:

1. **"Continue to the next step"** — Regenerate components with NEW intentional structural issues.
2. **Ask a normal question** — Respond conversationally in plain text. Do NOT generate any \`\`\`mdma blocks.

IMPORTANT: Only generate \`\`\`mdma blocks when explicitly asked or on the first message.`,
  },
  {
    key: 'bindings',
    label: 'Bindings & References',
    description: 'Binding syntax, resolution, deep field validation, action references',
    rules: ['binding-syntax', 'binding-resolution', 'action-references', 'thinking-block'],
    prompt: `${PREAMBLE}

Focus ONLY on binding and reference issues. Generate a contact submission workflow with these exact components, each with intentional binding/reference problems:

## Required broken components

1. \`\`\`mdma block: **form** id: \`contact-form\` — Contact form
   - Fields:
     - full-name (text, required, label: "Full Name")
     - email (email, required, sensitive: true, label: "Email Address")
     - phone (text, sensitive: true, label: "Phone Number")
     - message (textarea, required, label: "Message")
   - Set \`onSubmit: nonexistent-handler\` (invalid target — ID doesn't exist)

2. \`\`\`mdma block: **table** id: \`submission-summary\` — Summary table showing form data
   - Columns: field (header: "Field"), value (header: "Value")
   - Data rows using BROKEN bindings (always use double braces {{...}}):
     - field: "Name", value: \`{{ contact-form.full-name }}\` (extra whitespace inside braces)
     - field: "Email", value: \`{{missing_form.email}}\` (references non-existent component "missing_form")
     - field: "Phone", value: \`{{contact-form.nonexistent}}\` (field "nonexistent" doesn't exist on contact-form)
     - field: "Message", value: \`{{}}\` (empty binding — no path inside braces)

3. \`\`\`mdma block: **callout** id: \`submission-status\` variant: info
   - content: "Your submission for {{contact-form.nonexistent_field}} has been received."
     (deep binding mismatch — contact-form has no field named "nonexistent_field")

4. \`\`\`mdma block: **button** id: \`submit-btn\` variant: primary
   - text: "Submit Contact Form"
   - Set \`onAction: missing-action\` (invalid target — ID doesn't exist)

5. \`\`\`mdma block: **webhook** id: \`contact-webhook\`
   - url: "https://api.example.com/contacts"
   - method: POST
   - Set \`trigger: ghost-component\` (invalid target — ID doesn't exist)
   - body with broken binding: \`data: contact-form.values\` (bare binding, missing {{ }})

Generate all 5 components with the intentional binding and reference mistakes described above.

## Between MDMA generations

Between generating MDMA steps, the user may:

1. **"Continue to the next step"** — Regenerate components with NEW intentional binding issues.
2. **Ask a normal question** — Respond conversationally in plain text. Do NOT generate any \`\`\`mdma blocks.

IMPORTANT: Only generate \`\`\`mdma blocks when explicitly asked or on the first message.`,
  },
  {
    key: 'pii',
    label: 'PII & Sensitive Data',
    description: 'Sensitive flags, required markers',
    rules: ['sensitive-flags', 'required-markers', 'thinking-block'],
    prompt: `${PREAMBLE}

Focus ONLY on PII and data sensitivity issues. Generate a KYC (Know Your Customer) verification form with these exact components, each missing sensitive/required flags:

## Required broken components

1. \`\`\`mdma block: **form** id: \`kyc-form\` — Customer verification form
   - Fields (ALL must be missing \`sensitive: true\` — this is intentional):
     - full-name (text, label: "Full Name") — also omit \`required: true\`
     - email (email, label: "Email Address") — also omit \`required: true\`
     - phone (text, label: "Phone Number")
     - ssn (text, label: "Social Security Number")
     - date-of-birth (date, label: "Date of Birth")
     - home-address (text, label: "Home Address")
     - card-number (text, label: "Credit Card Number")
     - passport-number (text, label: "Passport Number")
   - onSubmit: kyc-submitted

2. \`\`\`mdma block: **table** id: \`customer-records\` — Customer data table
   - Columns (ALL must be missing \`sensitive: true\`):
     - name (header: "Name")
     - email (header: "Email")
     - phone (header: "Phone")
     - ssn (header: "SSN")
     - address (header: "Address")
   - Data: 3 rows with sample customer data

3. \`\`\`mdma block: **callout** id: \`kyc-submitted\` variant: success
   - content: "KYC verification submitted successfully."

Generate all 3 components. Do NOT add sensitive: true or required: true to any field — the validator should catch all of them.

## Between MDMA generations

Between generating MDMA steps, the user may:

1. **"Continue to the next step"** — Regenerate the components with NEW intentional issues (different from before).
2. **Ask a normal question** — Respond conversationally in plain text. Do NOT generate any \`\`\`mdma blocks.

IMPORTANT: Only generate \`\`\`mdma blocks when explicitly asked or on the first message.`,
  },
  {
    key: 'forms',
    label: 'Form Validation',
    description: 'Select options, field name typos, placeholder content, expected components',
    rules: ['select-options', 'field-name-typos', 'placeholder-content', 'expected-components', 'thinking-block'],
    prompt: `${PREAMBLE}

Focus ONLY on form-specific issues. Generate a single job application form with intentional problems:

## Required broken components

1. \`\`\`mdma block: **form** id: \`job-application\` — Job application form
   - Fields:
     - full-name (text, required) — BUT set label: "TODO"
     - email (email, required, sensitive) — BUT set label: "..."
     - phone (text, sensitive) — BUT set label: "TBD"
     - university (text, required) — BUT set label: "Lorem ipsum"
     - highest-degree (select, required) — BUT use malformed options: one string "PhD" mixed with {label, value} objects
     - department (select, required) — BUT omit the options array entirely
     - start-date (date, required) — label: "Preferred Start Date"
   - Set \`submit: apply-btn\` instead of correct \`onSubmit: apply-btn\` (field name typo)

2. \`\`\`mdma block: **callout** id: \`application-note\` variant: info
   - Set title: "FIXME" and content: "Please review your application before submitting."

3. \`\`\`mdma block: **button** id: \`apply-btn\` variant: primary
   - text: "Submit Application"
   - Set \`onClick: submit-application\` instead of correct \`onAction: submit-application\` (field name typo)

Generate all 3 components with the intentional mistakes described above.

## Between MDMA generations

Between generating MDMA steps, the user may:

1. **"Continue to the next step"** — This means the fixer has already fixed your output. Regenerate the components with NEW intentional issues (different from before).
2. **Ask a normal question** — Respond conversationally in plain text. Do NOT generate any \`\`\`mdma blocks.

IMPORTANT: Only generate \`\`\`mdma blocks when explicitly asked or on the first message.`,
  },
  {
    key: 'tables-charts',
    label: 'Tables & Charts',
    description: 'Table data keys, chart axis validation',
    rules: ['table-data-keys', 'chart-validation', 'thinking-block'],
    prompt: `${PREAMBLE}

Focus ONLY on table and chart data issues. Generate a sales dashboard with these exact components, each with intentional problems:

## Required broken components

1. \`\`\`mdma block: **table** id: \`sales-table\` — Sales summary table
   - Columns: product (header: "Product"), revenue (header: "Revenue"), units (header: "Units Sold")
   - BUT use wrong data keys: \`product_name\` instead of \`product\`, \`total_revenue\` instead of \`revenue\`, \`quantity\` instead of \`units\`
   - Include 3 data rows (Widget A, Widget B, Widget C)

2. \`\`\`mdma block: **chart** id: \`sales-chart\` variant: bar — Sales bar chart
   - CSV data with headers: month,sales,returns
   - 4 rows of data (Jan-Apr)
   - BUT set xAxis: "date" (doesn't exist, should be "month") and yAxis: ["revenue", "refunds"] (don't exist, should be "sales", "returns")

3. \`\`\`mdma block: **table** id: \`users-table\` — User analytics table
   - Columns: name (header: "Name"), email (header: "Email", sensitive: true), signups (header: "Sign-ups")
   - Use data: analytics-form.results (bare binding, missing {{ }})

4. \`\`\`mdma block: **chart** id: \`users-chart\` variant: line — User growth line chart
   - CSV data with ONLY a header row: week,new_users,active_users (no data rows)
   - Set xAxis: "week", yAxis: ["new_users", "active_users"]

Generate all 4 components with the intentional mismatches described above.`,
  },
  {
    key: 'flow',
    label: 'Stepper Flow',
    description: 'Flow ordering, thinking block, action targets, expected components',
    rules: ['flow-ordering', 'thinking-block', 'action-references', 'expected-components'],
    prompt: `${PREAMBLE}

Focus ONLY on component flow and reference issues. Generate a user registration and approval workflow with ALL of these intentional problems:

## Required broken structure

Generate exactly these components in ONE message (this is intentionally wrong — the validator should catch it):

1. \`\`\`mdma block: **form** id: \`registration-form\` with fields: full-name (text, required), email (email, required, sensitive), department (select with options: Engineering, Marketing, Sales)
   - Set \`onSubmit: approval-gate\` (this creates a multi-step flow error — form targets an interactive component)

2. \`\`\`mdma block: **approval-gate** id: \`approval-gate\` title: "Manager Approval"
   - Set \`onApprove: registration-form\` (this creates a circular reference — approval points back to form)
   - Set \`onDeny: nonexistent-rejection\` (this is an invalid action target — ID doesn't exist)

3. \`\`\`mdma block: **button** id: \`notify-btn\` text: "Send Notification"
   - Set \`onAction: approval-gate\` (backward reference + multi-step chain)

4. \`\`\`mdma block: **callout** id: \`orphan-notice\` variant: info, content: "This notice is not referenced by anything"
   (orphaned component — no other component points to it)

5. \`\`\`mdma block: **callout** id: \`orphan-table-info\` variant: warning, content: "Another orphan"
   (second orphaned component)

6. \`\`\`mdma block: **webhook** id: \`notify-webhook\` url: https://api.example.com/notify, method: POST
   - Set \`trigger: missing-component\` (invalid action target — ID doesn't exist)

Generate all 6 components in a single message. The validator should detect: multi-step flow errors, circular references, orphaned components, invalid action targets, and backward references.

## Between MDMA generations

Between generating MDMA steps, the user may:

1. **"Continue to the next step"** — This means the fixer has already split your broken output into step 1. Now generate ONLY step 2 (the approval-gate step) with intentional issues. Do NOT regenerate step 1.
2. **Ask a normal question** ("What's that?", "How does this work?", etc.) — Respond conversationally in plain text. Do NOT generate any \`\`\`mdma blocks. Just answer their question about the workflow.
3. **Click Submit/Approve/Deny** — The system auto-sends "Continue to the next step". Generate the next step only.

IMPORTANT: Only generate \`\`\`mdma blocks when explicitly asked to generate a step or on the first message. For all other user messages, respond with plain text only.`,
  },
  {
    key: 'approval',
    label: 'Approval & Webhooks',
    description: 'Field name typos on approval-gate, action references on webhooks',
    rules: ['field-name-typos', 'action-references', 'schema-conformance', 'thinking-block'],
    prompt: `${PREAMBLE}

Focus ONLY on approval gate and webhook issues. Generate an expense approval workflow with these exact components, each with intentional problems:

## Required broken components

1. \`\`\`mdma block: **form** id: \`expense-form\` — Expense submission form
   - Fields:
     - amount (number, required, label: "Amount")
     - description (textarea, required, label: "Description")
     - category (select, required, label: "Category", options: [{label: "Travel", value: "travel"}, {label: "Equipment", value: "equipment"}, {label: "Software", value: "software"}])
   - onSubmit: expense-review

2. \`\`\`mdma block: **approval-gate** id: \`expense-review\` — Manager review
   - BUT omit the required \`title\` field
   - description: "Manager must approve expenses over $100."
   - Use \`roles: ["manager", "director"]\` instead of correct \`allowedRoles\`
   - Use \`approvers: 2\` instead of correct \`requiredApprovers\`
   - Set \`onApprove: nonexistent-approval-handler\` (invalid target — doesn't exist)
   - Set \`onDeny: ghost-rejection\` (invalid target — doesn't exist)
   - requireReason: true

3. \`\`\`mdma block: **webhook** id: \`expense-notification\` — Notification webhook
   - BUT omit the required \`url\` field
   - method: POST
   - Set \`trigger: phantom-trigger\` (invalid target — doesn't exist)

4. \`\`\`mdma block: **webhook** id: \`expense-audit-log\` — Audit logging webhook
   - url: "https://api.example.com/audit"
   - method: POST
   - Set \`trigger: missing-button\` (invalid target — doesn't exist)

5. \`\`\`mdma block: **callout** id: \`expense-approved\` variant: success
   - content: "Your expense has been approved and submitted for reimbursement."

6. \`\`\`mdma block: **callout** id: \`expense-denied\` variant: error
   - content: "Your expense has been denied. Please contact your manager for details."

Generate all 6 components with the intentional mistakes described above.

## Between MDMA generations

Between generating MDMA steps, the user may:

1. **"Continue to the next step"** — Regenerate components with NEW intentional approval/webhook issues.
2. **Ask a normal question** — Respond conversationally in plain text. Do NOT generate any \`\`\`mdma blocks.

IMPORTANT: Only generate \`\`\`mdma blocks when explicitly asked or on the first message.`,
  },
];

/**
 * Defines the correct flow for each variant so the fixer knows what each step
 * should look like. Passed as promptContext to buildFixerMessage().
 *
 * Only variants that involve multi-step workflows need entries here.
 */
export const FIXER_FLOW_RULES: Record<string, string> = {
  flow: `This is a user registration and approval workflow. The correct flow split across conversation turns:

- **Step 1:** Form \`registration-form\` with fields: full-name (text, required), email (email, required, sensitive), department (select). Include a success callout \`registration-submitted\`. The form's onSubmit should point to the callout.

- **Step 2:** Approval gate \`approval-gate\` with title "Manager Approval", description "Please review and approve this registration." Include a callout \`approval-complete\` (variant: success). The gate's onApprove should point to the callout.

- **Step 3:** Webhook \`notify-webhook\` (url: https://api.example.com/notify, method: POST) triggered by a button \`send-notification\` (text: "Send Notification"). Include a success callout \`workflow-complete\`. The webhook's trigger should point to the button.

Each step must contain exactly ONE interactive component + its supporting callouts/webhooks. Do not include components from other steps.`,
};

/**
 * Describes the correct component structure for each variant.
 * Used as promptContext for the LLM fixer so it knows what the fixed output
 * should look like — not how to break it.
 *
 * Keyed by variant key. Variants without an entry fall back to no promptContext.
 */
export const FIXER_CORRECT_STRUCTURE: Record<string, string> = {
  'tables-charts': `This is a sales dashboard with 4 components. The correct structure:

**1. sales-table** (table) — Sales summary
- Columns: product (header: "Product"), revenue (header: "Revenue"), units (header: "Units Sold")
- Data rows must use keys matching column keys exactly: product, revenue, units
- 3 rows: Widget A ($50,000, 1200), Widget B ($32,000, 800), Widget C ($18,000, 450)

**2. sales-chart** (chart, variant: bar) — Sales bar chart
- CSV data with headers: month,sales,returns
- 4 rows: Jan (12000,450), Feb (15000,380), Mar (18000,520), Apr (21000,410)
- xAxis: "month", yAxis: ["sales", "returns"] — must match actual CSV headers

**3. users-table** (table) — User analytics
- Columns: name (header: "Name"), email (header: "Email", sensitive: true), signups (header: "Sign-ups")
- Data must be wrapped in binding syntax: data: "{{analytics-form.results}}"

**4. users-chart** (chart, variant: line) — User growth
- CSV data with headers: week,new_users,active_users
- Must have at least 4 data rows (Week 1-4) with actual numeric data
- xAxis: "week", yAxis: ["new_users", "active_users"]

All table data keys must exactly match their column keys. All chart axes must reference actual CSV headers. Charts must have data rows, not just headers.`,

  forms: `This is a job application with 3 components. The correct structure:

**1. job-application** (form) — Job application form
- Fields:
  - full-name (text, required, label: "Full Name")
  - email (email, required, sensitive: true, label: "Email Address")
  - phone (text, sensitive: true, label: "Phone Number")
  - university (text, required, label: "University")
  - highest-degree (select, required, label: "Highest Degree", options: [{label: "Bachelor's", value: "bachelors"}, {label: "Master's", value: "masters"}, {label: "PhD", value: "phd"}])
  - department (select, required, label: "Department", options: [{label: "Engineering", value: "engineering"}, {label: "Marketing", value: "marketing"}, {label: "Sales", value: "sales"}])
  - start-date (date, required, label: "Preferred Start Date")
- onSubmit: apply-btn (NOT "submit" — the correct field name is "onSubmit")

**2. application-note** (callout, variant: info)
- title: "Application Info"
- content: "Please review your application before submitting."
- No placeholder text — use real, meaningful content

**3. apply-btn** (button, variant: primary)
- text: "Submit Application"
- onAction: submit-application (NOT "onClick" — the correct field name is "onAction")

All labels must be real text (no "TODO", "TBD", "...", "Lorem ipsum", "FIXME"). All select fields must have options as [{label, value}] objects. Use correct field names: onSubmit (not submit), onAction (not onClick).`,

  bindings: `This is a contact submission workflow with 5 components. The correct structure:

**1. contact-form** (form) — Contact form
- Fields:
  - full-name (text, required, defaultValue: "Jane Smith")
  - email (email, required, sensitive: true, defaultValue: "jane.smith@example.com")
  - phone (text, sensitive: true, defaultValue: "+1 555-0123")
  - message (textarea, required, defaultValue: "I'd like to learn more about your services.")
- onSubmit: submit-btn (must reference an existing component ID in this document)
- IMPORTANT: Include defaultValue on every field so bindings resolve immediately in the demo

**2. submission-summary** (table) — Summary of submitted data
- Columns: field (header: "Field"), value (header: "Value")
- Data rows with static inline values (the broken version used bindings to test syntax — the fixed version uses real data):
  - field: "Name", value: "Jane Smith"
  - field: "Email", value: "jane.smith@example.com"
  - field: "Phone", value: "+1 555-0123"
  - field: "Message", value: "I'd like to learn more about your services."

**3. submission-status** (callout, variant: info)
- content: "Your contact form submission has been received. We will get back to you shortly."

**4. submit-btn** (button, variant: primary)
- text: "Submit Contact Form"
- onAction: contact-webhook (must reference an existing component ID)

**5. contact-webhook** (webhook)
- url: "https://api.example.com/contacts"
- method: POST
- trigger: submit-btn (must reference an existing component ID)
- body bindings must use "{{contact-form.field}}" syntax with double braces and valid field names

All bindings must use {{component-id.field}} syntax — double braces, no whitespace, valid component IDs and field names. All action targets (onSubmit, onAction, trigger) must point to component IDs that exist in this document.`,

  structure: `This is an event registration system with 6 components. The correct structure:

**1. event-form** (form) — Event registration form (ID must be kebab-case)
- Fields:
  - event-name (text, required, label: "Event Name")
  - date (date, required, label: "Event Date")
  - category (select, label: "Category", options: [{label: "Conference", value: "conference"}, {label: "Workshop", value: "workshop"}])
- onSubmit: registration-complete

**2. attendee-list** (table) — Attendee list (ID must be kebab-case, not snake_case)
- Columns:
  - name (header: "Name")
  - email (header: "Email")
  - status (header: "Status")
- Data: 2 rows: {name: "Alice", email: "alice@example.com", status: "confirmed"}, {name: "Bob", email: "bob@example.com", status: "pending"}

**3. registration-info** (callout, variant: info) — rename from duplicate "notice"
- content: "Please fill in your details to register for the event."

**4. registration-warning** (callout, variant: warning) — rename from duplicate "notice"
- content: "Registration closes soon."

**5. submit-btn** (button, variant: primary) — ID must be kebab-case, not PascalCase
- text: "Register Now"
- onAction: registration-complete

**6. The "card" component must be changed to a valid type.** Replace with a callout:
- event-details (callout, variant: info)
- content: "Event Details: Join us for an exciting event with industry leaders."

All IDs must be unique kebab-case. All form fields must have labels. All table columns must have headers. All required fields (text, content) must be present. No YAML document separators (---). No unknown component types.`,

  approval: `This is an expense approval workflow with 6 components. The correct structure:

**1. expense-form** (form) — Expense submission
- Fields:
  - amount (number, required, label: "Amount")
  - description (textarea, required, label: "Description")
  - category (select, required, label: "Category", options: [{label: "Travel", value: "travel"}, {label: "Equipment", value: "equipment"}, {label: "Software", value: "software"}])
- onSubmit: expense-review

**2. expense-review** (approval-gate) — Manager review
- title: "Expense Approval" (REQUIRED — must not be omitted)
- description: "Manager must approve expenses over $100."
- allowedRoles: ["manager", "director"] (NOT "roles")
- requiredApprovers: 2 (NOT "approvers")
- onApprove: expense-approved (must reference existing component)
- onDeny: expense-denied (must reference existing component)
- requireReason: true

**3. expense-notification** (webhook) — Notification
- url: "https://api.example.com/notify" (REQUIRED — must not be omitted)
- method: POST
- trigger: expense-form (must reference existing component)

**4. expense-audit-log** (webhook) — Audit logging
- url: "https://api.example.com/audit"
- method: POST
- trigger: expense-form (must reference existing component)

**5. expense-approved** (callout, variant: success)
- content: "Your expense has been approved and submitted for reimbursement."

**6. expense-denied** (callout, variant: error)
- content: "Your expense has been denied. Please contact your manager for details."

Approval gates must use allowedRoles (not roles), requiredApprovers (not approvers), and include a title. Webhooks must have a url and a trigger pointing to an existing component. All onApprove/onDeny targets must reference existing component IDs.`,

  pii: `This is a KYC verification form with 3 components. The correct structure:

**1. kyc-form** (form) — Customer verification
- Fields:
  - full-name (text, required: true, label: "Full Name")
  - email (email, required: true, sensitive: true, label: "Email Address")
  - phone (text, sensitive: true, label: "Phone Number")
  - ssn (text, sensitive: true, label: "Social Security Number")
  - date-of-birth (date, sensitive: true, label: "Date of Birth")
  - home-address (text, sensitive: true, label: "Home Address")
  - card-number (text, sensitive: true, label: "Credit Card Number")
  - passport-number (text, sensitive: true, label: "Passport Number")
- onSubmit: kyc-submitted

PII fields that MUST have sensitive: true: email, phone, ssn, date-of-birth, home-address, card-number, passport-number.
Fields that MUST have required: true: full-name, email.

**2. customer-records** (table) — Customer data
- Columns:
  - name (header: "Name")
  - email (header: "Email", sensitive: true)
  - phone (header: "Phone", sensitive: true)
  - ssn (header: "SSN", sensitive: true)
  - address (header: "Address", sensitive: true)
- 3 data rows with sample customer data

**3. kyc-submitted** (callout, variant: success)
- content: "KYC verification submitted successfully."

Every field containing PII (email, phone, SSN, address, card numbers, DOB, passport) must have sensitive: true. Important fields like name and email must have required: true.`,
};

/**
 * Sample data to seed into message stores so bindings resolve with visible values.
 * Keyed by variant key. Each entry maps componentId → { fieldName: value }.
 * Dispatched as FIELD_CHANGED actions when a new store is created.
 */
export const SAMPLE_BINDING_DATA: Record<string, Record<string, Record<string, string>>> = {
  bindings: {
    'contact-form': {
      'full-name': 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+1 555-0123',
      message: "I'd like to learn more about your services.",
    },
  },
};

/**
 * Sample table data to inject into stores for demo rendering.
 * Keyed by variant key → component ID → array of row objects.
 * Applied after store creation so tables with binding data show real values.
 */
export const SAMPLE_TABLE_DATA: Record<string, Record<string, Array<Record<string, string>>>> = {
  bindings: {
    'submission-summary': [
      { field: 'Name', value: 'Jane Smith' },
      { field: 'Email', value: 'jane.smith@example.com' },
      { field: 'Phone', value: '+1 555-0123' },
      { field: 'Message', value: "I'd like to learn more about your services." },
    ],
  },
};

/**
 * Expected components per variant. Passed to validate() as expectedComponents
 * so the rule can verify the LLM generated the correct components with the right fields.
 * Keyed by variant key — only variants that need component verification need entries.
 */
/**
 * Per-step expected components for multi-step flow variants.
 * Each entry is an array of steps — the demo picks the right step
 * based on priorComponentIds to determine which components should
 * be in the current message.
 */
export const FLOW_EXPECTED_COMPONENTS: Record<string, Record<string, ExpectedComponent>[]> = {
  flow: [
    // Step 1: Registration form + success callout
    {
      'registration-form': {
        type: 'form',
        fields: ['full-name', 'email', 'department'],
        actions: { onSubmit: 'registration-submitted' },
      },
      'registration-submitted': { type: 'callout' },
    },
    // Step 2: Approval gate + success callout
    {
      'approval-gate': {
        type: 'approval-gate',
        actions: { onApprove: 'approval-complete' },
      },
      'approval-complete': { type: 'callout' },
    },
    // Step 3: Webhook + button + success callout
    {
      'notify-webhook': {
        type: 'webhook',
        actions: { trigger: 'send-notification' },
      },
      'send-notification': { type: 'button' },
      'workflow-complete': { type: 'callout' },
    },
  ],
};

export const EXPECTED_COMPONENTS: Record<string, Record<string, ExpectedComponent>> = {
  forms: {
    'job-application': {
      type: 'form',
      fields: ['full-name', 'email', 'phone', 'university', 'highest-degree', 'department', 'start-date'],
      actions: { onSubmit: 'apply-btn' },
    },
    'application-note': { type: 'callout' },
    'apply-btn': { type: 'button', actions: { onAction: 'submit-application' } },
  },
};

/**
 * Structured flow step definitions for deterministic validation via validateFlow().
 * Keyed by variant key — only variants with multi-step workflows need entries.
 */
export const FLOW_STEPS: Record<string, FlowStepDefinition[]> = {
  flow: [
    { label: 'Registration Form', type: 'form', id: 'registration-form' },
    { label: 'Manager Approval', type: 'approval-gate', id: 'approval-gate' },
    { label: 'Send Notification & Webhook', type: 'webhook', id: 'notify-webhook' },
  ],
};
