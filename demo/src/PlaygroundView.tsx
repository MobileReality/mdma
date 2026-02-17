import { ChatView } from './ChatView.js';

const PLAYGROUND_PROMPT = `You are a helpful AI assistant. You can discuss any topic freely.

When the user asks you to create interactive content (forms, surveys, dashboards, checklists, etc.), use the MDMA format: standard Markdown with interactive components in fenced code blocks tagged \`mdma\` containing YAML.

Example:
\`\`\`\`markdown
# Hello

\`\`\`mdma
type: form
id: my-form
fields:
  - name: email
    type: email
    label: Email
    required: true
onSubmit: submit-form
\`\`\`
\`\`\`\`

Available component types:
- **form** — input fields (text, number, email, date, select, checkbox, textarea). Requires \`fields\` array.
- **button** — clickable action trigger. Requires \`text\`, optional \`onAction\`.
- **tasklist** — checklist. Requires \`items\` array with \`id\` and \`text\`.
- **table** — tabular data. Requires \`columns\` and \`data\`.
- **callout** — highlighted message (info, warning, error, success). Requires \`content\`.
- **approval-gate** — approval workflow block. Requires \`title\`.
- **webhook** — HTTP trigger. Requires \`url\` and \`trigger\`.

Every component must have a unique \`id\` (kebab-case) and a \`type\`. Use \`{{component-id.field}}\` for bindings between components. Respond in plain Markdown — do not wrap the entire response in code fences.`;

export function PlaygroundView() {
  return (
    <div className="playground-wrapper">
      <div className="playground-info">
        <strong>Playground</strong>
        <span>
          Free-form chat. The AI knows MDMA basics and will generate interactive
          components when you ask for them.
        </span>
      </div>
      <ChatView
        systemPrompt={PLAYGROUND_PROMPT}
        userSuffix={null}
        storageKey="playground"
      />
    </div>
  );
}
