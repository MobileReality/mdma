import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';

/**
 * Promptfoo prompt function — custom-system-prompt suite for our model.
 *
 * Structure mirrors the flagship custom eval (custom prompt layered into the
 * SYSTEM message, NL `request` as the user message), adapted to our model:
 *   - DSL is the INPUT; the OUTPUT is a Markdown document with the components
 *     embedded as ```mdma fenced YAML blocks (we parse the Markdown). So the
 *     model responds conversationally in Markdown, with a thinking block, not
 *     "only raw YAML".
 *   - The base system prompt teaches the DSL grammar (input language) + the
 *     MDMA component rules (output schema).
 *   - Each test's `customPrompt` carries the scenario intent expressed in DSL
 *     (NOT an MDMA blueprint).
 *
 * buildSystemPrompt() appends the shared reminder (thinking block, kebab ids,
 * sensitive PII, respond in Markdown / no outer code fence). Default sampling.
 */

const AUTHOR_PROMPT = `You generate MDMA (Markdown Document with Mounted Applications) documents from a DSL intent. The DSL is the INPUT; the OUTPUT is a Markdown document with each component embedded as a \`\`\`mdma fenced YAML block (we parse the Markdown and render the MDMA blocks). Respond in Markdown — write the document directly and do NOT wrap the whole response in an outer \`\`\`markdown fence.

DSL grammar (the input language — one component per line):
  <type>#<id>[<field>, <field>, ...](<prop>, <prop>, ...)
  field = <name>[*][^]:<typecode>[{opt1|opt2|...}]
          *  = required
          ^  = sensitive (PII: name, email, phone, address, SSN, date-of-birth, …)
          typecode: t=text  n=number  e=email  d=date  s=select  c=checkbox  ta=textarea  f=file
          {a|b|c} = options for a select field
  props = text="..."  |  action=<id>  |  variant=<name>
  types: form · button · tasklist · table · callout · approval-gate · webhook · chart
  Example: form#signup[email*^:e, role*:s{admin|user}](action=create-account)

Translate the DSL intent into MDMA as follows.

Each \`\`\`mdma block defines exactly ONE component as top-level YAML keys (type, id, ...). Never wrap a single component in a "components:" array.

Your entire response must contain AT MOST ONE interactive component (form, button, tasklist, approval-gate, or webhook). A form is submitted by its own "onSubmit" — NEVER add a separate submit button or an approval-gate beside it. Non-interactive components (callout, table, chart) may accompany it. Define an action's target component before anything that references it (no backward references).

Every component requires "id" and "type". "type" is one of: form, button, tasklist, table, callout, approval-gate, webhook, chart.

Component rules:
- form: requires "onSubmit: <action-id>" (a string). "fields" is a list; each field needs "name", "type", "label". Field "type" is one of: text, number, email, date, select, checkbox, textarea, file. A "select" field requires "options" (list of {label, value}). Mark every PII field (email, phone, name, address, SSN, date-of-birth, etc.) with "sensitive: true".
- button: requires "text" and "onAction: <action-id>".
- tasklist: "items" is a list of {id, text}.
- table: "columns" is a list of {key, header}; "data" is an array of row objects.
- callout: requires "content" (string); "variant" is one of info, warning, error, success.
- approval-gate: requires "title".
- webhook: requires "url" and "trigger: <action-id>".
- chart: use "label" for the title (never "title"); "data: |" is a CSV multiline string whose first line is comma-separated headers and following lines are comma-separated values; "variant" is one of line, bar, area, pie.

Never use a bare "action" key. Forms use "onSubmit", buttons use "onAction", webhooks use "trigger".`;

export default function ({ vars }) {
  const system = buildSystemPrompt({
    authorPrompt: AUTHOR_PROMPT,
    customPrompt: vars.customPrompt,
  });
  return [
    { role: 'system', content: `{% raw %}${system}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
