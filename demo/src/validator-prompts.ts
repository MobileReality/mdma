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

export const VALIDATOR_PROMPT_VARIANTS: ValidatorPromptVariant[] = [
  {
    key: 'all',
    label: 'All Rules',
    description: 'Stress-test all validator rules at once',
    rules: [
      'yaml-correctness', 'schema-conformance', 'duplicate-ids', 'id-format',
      'binding-syntax', 'binding-resolution', 'action-references', 'sensitive-flags',
      'required-markers', 'thinking-block', 'select-options', 'placeholder-content',
      'field-name-typos', 'table-data-keys', 'chart-validation',
      'unreferenced-components', 'flow-ordering',
    ],
    prompt: `${PREAMBLE}

Mix in as many of these problems as possible across your components:

1. **Duplicate IDs** — Use the same id for two different components
2. **Bad ID format** — Use camelCase or snake_case IDs instead of kebab-case (e.g. id: myForm, id: user_table)
3. **Missing sensitive flags** — Include PII fields like email, phone, ssn, address without sensitive: true
4. **Missing thinking block** — Omit the thinking block entirely
5. **Bad binding syntax** — Use single braces {var.path} instead of {{var.path}}, or add extra whitespace {{ var.path }}
6. **Empty callout content** — Create a callout with content: "" or omit the content field
7. **Missing table headers** — Define table columns with just key: but no header:
8. **Missing form labels** — Define form fields with just name: but no label:
9. **YAML document separators** — Add --- at the end of an mdma block
10. **Bare binding in table data** — Use data: some-component.rows instead of data: "{{some-component.rows}}"
11. **Select fields without options** — Create a form select field without any options defined
12. **Placeholder content** — Use "TODO", "TBD", "...", or "Lorem ipsum" as field labels or content
13. **Field name typos** — Use "roles" instead of "allowedRoles" on approval-gate, "onClick" instead of "onAction" on button
14. **Table data key mismatch** — Table data rows with keys that don't match defined columns
15. **Invalid chart axes** — Chart with xAxis or yAxis referencing columns not in the CSV data
16. **Invalid action targets** — Use onSubmit/onAction pointing to non-existent component IDs
17. **Unreferenced components** — Add a component that no other component references via bindings or actions
18. **Backward references** — Make action targets point to components defined earlier in the document
19. **Deep binding misses** — Use bindings like {{form.nonexistent_field}} where the field doesn't exist on the form

Try to include at least 8-10 different issues in each response.`,
  },
  {
    key: 'structure',
    label: 'Structure & YAML',
    description: 'YAML correctness, duplicate IDs, ID format, schema conformance',
    rules: ['yaml-correctness', 'schema-conformance', 'duplicate-ids', 'id-format'],
    prompt: `${PREAMBLE}

Focus ONLY on these structural issues:

1. **Duplicate IDs** — Use the same id for two or more components (e.g. two callouts both with id: notice)
2. **Bad ID format** — Use camelCase (myForm), snake_case (user_table), or UPPERCASE (LOUD_BTN) instead of kebab-case
3. **YAML document separators** — Add --- at the end of mdma blocks
4. **Missing required fields** — Omit required fields like "text" on buttons or "content" on callouts
5. **Unknown component types** — Use a type like "card" or "panel" that doesn't exist in the registry
6. **Missing form labels** — Define form fields with just name: but no label:
7. **Missing table headers** — Define table columns with just key: but no header:

Generate a document with at least 5-6 components that contains multiple structural issues. Include forms, tables, callouts, and buttons.`,
  },
  {
    key: 'bindings',
    label: 'Bindings & References',
    description: 'Binding syntax, resolution, deep field validation, action references',
    rules: ['binding-syntax', 'binding-resolution', 'action-references'],
    prompt: `${PREAMBLE}

Focus ONLY on binding and reference issues:

1. **Bad binding syntax** — Use single braces {form.email} instead of {{form.email}}
2. **Whitespace in bindings** — Use {{ form.email }} with extra spaces inside the braces
3. **Empty bindings** — Use {{}} with nothing inside
4. **Non-existent component references** — Use bindings like {{missing_form.email}} where missing_form doesn't exist
5. **Deep binding mismatches** — Use {{myform.nonexistent}} where myform exists but has no field named "nonexistent"
6. **Invalid onSubmit targets** — Set form onSubmit to a non-existent component ID
7. **Invalid onAction targets** — Set button onAction to a non-existent component ID
8. **Invalid webhook trigger** — Set webhook trigger to a non-existent component ID

Generate a multi-component document (form, table, callout, button, webhook) with bindings between them — but intentionally make the binding paths and action targets wrong.`,
  },
  {
    key: 'pii',
    label: 'PII & Sensitive Data',
    description: 'Sensitive flags, required markers',
    rules: ['sensitive-flags', 'required-markers'],
    prompt: `${PREAMBLE}

Focus ONLY on PII and data sensitivity issues:

1. **Missing sensitive flags on form fields** — Include fields named email, phone, ssn, address, card_number, date_of_birth without sensitive: true
2. **Missing sensitive flags on table columns** — Include table columns with keys like email, phone, address without sensitive: true
3. **Missing required on important fields** — Fields named "name", "email", "title" should typically be required but omit the required flag

Generate a comprehensive form (like a user registration or KYC form) with many PII fields and a table displaying user data — but forget to mark any of them as sensitive or required.`,
  },
  {
    key: 'forms',
    label: 'Form Validation',
    description: 'Select options, field name typos, placeholder content',
    rules: ['select-options', 'field-name-typos', 'placeholder-content'],
    prompt: `${PREAMBLE}

Focus ONLY on form-specific issues:

1. **Select fields without options** — Create select fields with no options array at all
2. **Malformed select options** — Create select options as plain strings or objects missing label/value
3. **Placeholder labels** — Use "TODO", "TBD", "...", or "Lorem ipsum" as form field labels
4. **Placeholder content** — Use "FIXME" or "sample" as callout content or component titles
5. **Field name typos** — On buttons use "onClick" instead of "onAction", on forms use "submit" instead of "onSubmit"

Generate a multi-step form (like an application form) with multiple select fields, text inputs, and buttons — but with these mistakes throughout.`,
  },
  {
    key: 'tables-charts',
    label: 'Tables & Charts',
    description: 'Table data keys, chart axis validation',
    rules: ['table-data-keys', 'chart-validation'],
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
    label: 'Flow & References',
    description: 'Flow ordering, unreferenced components, action targets',
    rules: ['flow-ordering', 'unreferenced-components', 'action-references'],
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
    rules: ['field-name-typos', 'action-references', 'schema-conformance'],
    prompt: `${PREAMBLE}

Focus ONLY on approval gate and webhook issues:

1. **"roles" instead of "allowedRoles"** — Use the field name "roles" on approval-gate components
2. **"approvers" instead of "requiredApprovers"** — Use the wrong field name for the approver count
3. **Invalid webhook trigger** — Set webhook trigger to a component ID that doesn't exist
4. **Invalid onApprove/onDeny targets** — Point approval gate actions to non-existent components
5. **Missing required fields** — Omit the required "title" field on approval-gate or "url" on webhook

Generate an expense approval workflow with: a form for expense details, an approval-gate for manager review, a webhook for notification, and callouts for status — but use the wrong field names and broken references.`,
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
};

/**
 * Structured flow step definitions for deterministic validation via validateFlow().
 * Keyed by variant key — only variants with multi-step workflows need entries.
 */
export const FLOW_STEPS: Record<string, import('@mobile-reality/mdma-validator').FlowStepDefinition[]> = {
  flow: [
    { label: 'Registration Form', type: 'form', id: 'registration-form' },
    { label: 'Manager Approval', type: 'approval-gate', id: 'approval-gate' },
    { label: 'Send Notification & Webhook', type: 'webhook', id: 'notify-webhook' },
  ],
};
