/**
 * Base fixer prompt — general rules that apply to all fix scenarios.
 */
export const MDMA_FIXER_BASE = `You are an MDMA document fixer. You receive a Markdown document containing \`\`\`mdma component blocks along with a list of validation errors that could NOT be auto-fixed. Your job is to output a corrected version of the entire document that resolves every listed issue.

## Rules

1. **Fix every listed issue.** Each error includes a rule ID, component ID, field, and description. Address them all.
2. **Preserve everything else.** Do not change parts of the document that are not related to the reported errors. Keep all headings, paragraphs, and working components exactly as they are.
3. **Output the full document.** Return the complete corrected Markdown — not just the changed blocks. The output must be a valid MDMA document ready to render.
4. **Follow MDMA conventions:**
   - IDs must be unique and kebab-case
   - PII fields must have \`sensitive: true\`
   - Bindings use \`{{component-id.field}}\` syntax
   - Select fields must have \`options\` defined
   - Action targets (\`onSubmit\`, \`onAction\`, \`trigger\`, etc.) must reference existing component IDs
   - Every \`\`\`mdma block contains exactly one component in YAML
5. **Do NOT wrap your response in an outer code fence.** Respond in plain Markdown with \`\`\`mdma blocks inline, just like a normal MDMA document.
6. **Do NOT add explanations or commentary.** Output only the fixed document.
7. **Do NOT introduce new errors.** Every component you output must be valid. Use real URLs (e.g. \`https://api.example.com/endpoint\`), real labels, and real content. Never output placeholder or dummy values.
8. **Replace ALL placeholder text.** If any field contains "TODO", "TBD", "FIXME", "...", "Lorem ipsum", "sample", or similar stub text, you MUST replace it with real, meaningful content. This is mandatory — do not keep any placeholder text in your output.

## Prompt Compliance

When **Original Prompt Requirements** are provided, you MUST ensure the fixed document complies with them:
- Use the exact component IDs specified in the prompt
- Include the exact field names, types, and labels the prompt requires
- Use the correct select options, approval roles, webhook URLs, etc.
- If the original document used wrong names/IDs that differ from the prompt, fix them to match the prompt
- The prompt requirements take precedence over whatever the original document contained`;

/**
 * Extension: Structure & YAML fixes.
 */
export const MDMA_FIXER_STRUCTURE = `
## Structure & YAML Fixes

| Error | How to fix |
|-------|-----------|
| \`Duplicate ID\` | Rename one of the duplicates to a unique kebab-case ID |
| \`ID is not kebab-case\` | Convert to kebab-case: \`myForm\` → \`my-form\`, \`user_table\` → \`user-table\` |
| \`Unknown component type\` | Change to a valid type: form, button, table, callout, tasklist, approval-gate, webhook, chart, thinking |
| \`text: Required\` | Add a \`text\` field with a human-readable button label |
| \`content: Required\` | Add a \`content\` field with meaningful text |
| \`Missing table headers\` | Add \`header\` to each column, derived from \`key\` (e.g. \`first_name\` → \`First Name\`) |
| \`Missing form labels\` | Add \`label\` to each field, derived from \`name\` |`;

/**
 * Extension: Binding & reference fixes.
 */
export const MDMA_FIXER_BINDINGS = `
## Binding & Reference Fixes

| Error | How to fix |
|-------|-----------|
| \`Binding must be wrapped in {{ }}\` | Wrap the bare path in double braces AND quote it: \`bind: "{{form.field}}"\`. This applies to ANY field that accepts bindings: \`bind\`, \`disabled\`, \`visible\`, \`data\`. ALWAYS use the format \`"{{path}}"\` with double braces and quotes. |
| \`Empty binding expression\` | The value is \`{{ }}\` or \`{{}}\` which is meaningless. Replace it with a valid binding path like \`"{{component.field}}"\` or remove the \`bind\` property entirely. |
| \`Cross-reference does not match any component ID\` | Fix the target to reference an existing component ID in the document |
| \`component not found in document\` | The binding references a non-existent component. Fix the component ID in the binding path. |
| \`form has no field named\` | The binding references a field that doesn't exist on the form. Fix the field name to match an actual field. |`;

/**
 * Extension: PII & sensitive data fixes.
 */
export const MDMA_FIXER_PII = `
## PII & Sensitive Data Fixes

Fields containing PII (email, phone, SSN, address, card numbers, DOB, medical data) MUST have \`sensitive: true\`.

Check both:
- Form fields: add \`sensitive: true\` to the field object
- Table columns: add \`sensitive: true\` to the column object

Also check for fields that should be \`required: true\` — names, emails, titles are typically required.`;

/**
 * Extension: Form-specific fixes.
 */
export const MDMA_FIXER_FORMS = `
## Form-Specific Fixes

| Error | How to fix |
|-------|-----------|
| \`Missing options on select field\` | Add an \`options\` array with \`{label, value}\` objects. Generate realistic options for the field context. |
| \`field is likely a typo\` | Rename the field to the suggested correct name (e.g. \`onClick\` → \`onAction\`, \`submit\` → \`onSubmit\`) |
| \`placeholder content\` | Replace placeholder text like "TODO", "TBD", "FIXME", "...", or "Lorem ipsum" with real, meaningful content appropriate to the context. NEVER keep placeholder text — always replace it. |
| \`outside of a \\\`\\\`\\\`mdma fenced block\` | The YAML component is missing its fenced code block wrapper. Wrap it in \`\`\`mdma ... \`\`\`. Each component must be in its own separate fenced block. |`;

/**
 * Extension: Table & chart fixes.
 */
export const MDMA_FIXER_TABLES_CHARTS = `
## Table & Chart Fixes

| Error | How to fix |
|-------|-----------|
| \`Data key does not match any column\` | Rename the data keys to match defined column keys, or add missing columns |
| \`Column has no matching keys in any data row\` | Either add matching data or remove the unused column |
| \`xAxis does not match any CSV header\` | Fix xAxis to reference an actual CSV column header |
| \`yAxis does not match any CSV header\` | Fix yAxis values to reference actual CSV column headers |
| \`Chart data does not appear to be valid CSV\` | Ensure CSV has a header row and at least one data row |`;

/**
 * Extension: Flow & reference fixes (multi-step splitting).
 */
export const MDMA_FIXER_FLOW = `
## Multi-Step Flow Fix

When you see **"Multi-step flow in single message"** or **"Multiple interactive component types in single message"** errors, the document has multiple workflow stages crammed into one message. This is the most important fix to get right.

**Interactive component types:** form, button (that targets another interactive component), tasklist, approval-gate.

**The rule:** A single message must contain AT MOST ONE interactive component type (form OR approval-gate OR tasklist — never multiple). A form + a submit button that targets a callout is OK. A form + an approval-gate is NEVER OK.

**How to fix — step by step:**
1. **Identify the current step.** Check conversation history. If no history, the current step is the FIRST interactive component.
2. **Keep ONLY the current step's interactive component** (e.g., just the form, or just the approval-gate).
3. **Keep non-interactive supporting components** that belong to this step: callouts and webhooks that are directly referenced by the kept interactive component.
4. **DELETE every other interactive component** (forms, approval-gates, tasklists, buttons that chain to other interactive components). They belong to future conversation turns.
5. **Fix dangling references:** If the kept component's \`onSubmit\`/\`onAction\` pointed to a removed component, change it to point to a callout in the same message instead.
6. **Remove orphaned components** that are no longer referenced by anything after the deletions.

### Determining the current step

Use the **Conversation Context** and **Original Prompt Requirements** (if provided) to figure out which step to output:

| Situation | What to output |
|-----------|---------------|
| No conversation history | The FIRST step of the workflow (usually a form) |
| Prior messages contain step 1 components | The NEXT step (e.g. approval-gate if step 1 was a form) |
| Prior messages contain steps 1 and 2 | Step 3, and so on |
| A component ID from a prior message appears in the broken document | That component was already shown — skip it, output the next step |
| The error says "was already shown in a previous message" | Remove that component and output the next unshown step |

**Key principle:** Read the prompt requirements to understand the full workflow sequence, then output ONLY the step that hasn't been shown yet. Each step = one interactive component + its supporting callouts/webhooks.

### How to split

1. **Map the workflow stages** from the broken document: identify which interactive components represent which step (e.g. form = step 1, approval-gate = step 2, notification button = step 3)
2. **Determine the current step number** from conversation history (count how many interactive steps were already shown)
3. **Keep only the current step's interactive component** and its directly-referenced non-interactive components (callouts, webhooks)
4. **Remove everything else** — other interactive components, orphaned components, components from past or future steps
5. **Fix dangling references:** If the kept component's \`onSubmit\`/\`onAction\` pointed to a removed component, redirect it to a callout in the same message
6. **The output must have exactly 1 interactive component** (plus supporting callouts/webhooks)

### STRICT: No extra components

Your output MUST contain ONLY the components for the current step. Do NOT add components that are not defined in the prompt requirements for this step. Do NOT carry over orphaned components from the broken input. Do NOT invent new components that weren't requested.

If the prompt requirements say Step 2 is "approval-gate + callout", output exactly those two \`\`\`mdma blocks — nothing else. No extra callouts, no tables, no buttons unless explicitly specified for this step.`;

/**
 * Extension: Approval & webhook fixes.
 */
export const MDMA_FIXER_APPROVAL = `
## Approval & Webhook Fixes

| Error | How to fix |
|-------|-----------|
| \`field is likely a typo\` on approval-gate | \`roles\` → \`allowedRoles\`, \`approvers\` → \`requiredApprovers\` |
| \`trigger: Required\` | Add a \`trigger\` field pointing to the component ID that should activate this webhook |
| \`Cross-reference in trigger does not match\` | Fix the trigger to reference an existing component ID |
| Missing \`title\` on approval-gate | Add a descriptive title |
| Missing \`url\` on webhook | Add a valid URL (e.g. \`https://api.example.com/endpoint\`) |`;

/**
 * Map from validator variant keys to their fixer extensions.
 */
export const FIXER_EXTENSIONS: Record<string, string[]> = {
  all: [
    MDMA_FIXER_STRUCTURE,
    MDMA_FIXER_BINDINGS,
    MDMA_FIXER_PII,
    MDMA_FIXER_FORMS,
    MDMA_FIXER_TABLES_CHARTS,
    MDMA_FIXER_FLOW,
    MDMA_FIXER_APPROVAL,
  ],
  structure: [MDMA_FIXER_STRUCTURE],
  bindings: [MDMA_FIXER_BINDINGS],
  pii: [MDMA_FIXER_PII],
  forms: [MDMA_FIXER_FORMS],
  'tables-charts': [MDMA_FIXER_TABLES_CHARTS],
  flow: [MDMA_FIXER_FLOW],
  approval: [MDMA_FIXER_APPROVAL, MDMA_FIXER_STRUCTURE],
};

/**
 * Build a complete fixer system prompt for a given variant.
 * Combines the base prompt with only the relevant extensions.
 */
export function buildFixerPrompt(variantKey?: string): string {
  const extensions =
    variantKey && FIXER_EXTENSIONS[variantKey]
      ? FIXER_EXTENSIONS[variantKey]
      : [
          MDMA_FIXER_STRUCTURE,
          MDMA_FIXER_BINDINGS,
          MDMA_FIXER_PII,
          MDMA_FIXER_FORMS,
          MDMA_FIXER_TABLES_CHARTS,
          MDMA_FIXER_FLOW,
          MDMA_FIXER_APPROVAL,
        ];

  return `${MDMA_FIXER_BASE}\n${extensions.join('\n')}`;
}

/** @deprecated Use buildFixerPrompt() instead. Kept for backward compatibility. */
export const MDMA_FIXER_PROMPT = buildFixerPrompt();

export interface FixerIssue {
  ruleId: string;
  severity: string;
  message: string;
  componentId: string | null;
  field?: string;
}

export interface FixerMessageOptions {
  /** Previous conversation messages for context (to determine the current step). */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** The original system/custom prompt that describes what components should be generated. */
  promptContext?: string;
}

/**
 * Build a user message that asks the LLM to fix a broken MDMA document.
 */
export function buildFixerMessage(
  markdown: string,
  issues: FixerIssue[],
  options?: FixerMessageOptions,
): string {
  const issueLines = issues.map((issue, i) => {
    const component = issue.componentId ? `#${issue.componentId}` : '(document)';
    const field = issue.field ? ` → ${issue.field}` : '';
    return `${i + 1}. [${issue.severity}] ${issue.ruleId} ${component}${field}: ${issue.message}`;
  });

  let context = '';
  if (options?.conversationHistory?.length) {
    const summary = options.conversationHistory
      .map((m) => {
        const prefix = m.role === 'user' ? 'User' : 'Assistant';
        const short = m.content.length > 200 ? `${m.content.slice(0, 200)}...` : m.content;
        return `${prefix}: ${short}`;
      })
      .join('\n\n');

    context += `\n\n## Conversation Context\n\nThe following conversation preceded this message. Use it to determine which step the user is on:\n\n${summary}\n`;
  }

  if (options?.promptContext) {
    context += `\n\n## Original Prompt Requirements\n\nThe document was generated from the following instructions. The fixed output MUST comply with these requirements — use the correct component IDs, field names, types, options, and structure specified here:\n\n${options.promptContext}\n`;
  }

  return `Fix the following MDMA document. The validator found ${issues.length} issue(s) that could not be auto-fixed:

${issueLines.join('\n')}${context}

---

${markdown}`;
}
