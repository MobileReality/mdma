export interface ValidatorPromptVariant {
  key: string;
  label: string;
  description: string;
  rules: string[];
  prompt: string;
}

const PREAMBLE = `You are an AI assistant for testing the MDMA validator.
Generate MDMA components with intentional issues so the validator can demonstrate its detection and auto-fix capabilities.
Generate real, useful-looking components — just with the specified intentional mistakes baked in.`;

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

Focus ONLY on table and chart data issues:

1. **Table data key mismatch** — Define table columns as [name, email, role] but include data rows with keys like [full_name, mail, position] that don't match
2. **Missing column data** — Define a column that no data row populates
3. **Extra data keys** — Include data row keys that aren't in the columns
4. **Invalid chart xAxis** — Set xAxis to a header name that doesn't exist in the CSV data
5. **Invalid chart yAxis** — Set yAxis to header names that don't exist in the CSV
6. **Chart with only headers** — Provide CSV data with only a header row and no data rows
7. **Bare table data binding** — Use data: some-component.rows without wrapping in {{ }}

Generate a dashboard with 2 tables and 2 charts — a sales summary and a user analytics view — but with mismatched column/data keys and wrong axis references.`,
  },
  {
    key: 'flow',
    label: 'Flow & References',
    description: 'Flow ordering, unreferenced components, action targets',
    rules: ['flow-ordering', 'unreferenced-components', 'action-references'],
    prompt: `${PREAMBLE}

Focus ONLY on component flow and reference issues:

1. **Backward action references** — Make onSubmit or onAction point to a component defined EARLIER in the document (target appears before the source)
2. **Circular references** — Create a cycle: component A's onSubmit points to B, and B's onAction points back to A
3. **Unreferenced components** — Add a callout or table that no other component references via bindings or action fields (orphan component)
4. **Invalid action targets** — Use onSubmit, onAction, onComplete, onApprove, onDeny pointing to IDs that don't exist

Generate a multi-step workflow (form submission → approval → notification) with 6+ components — but intentionally create circular dependencies, orphaned components, and broken action chains.`,
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
