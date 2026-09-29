import type { DataSourceDescriptor } from '@mobile-reality/mdma-spec';
import { MDMA_AUTHOR_PROMPT } from './prompts/mdma-author/default.js';

/**
 * A host-registered custom-component variant, described to the model so it can
 * author a matching `custom` block. Intent-level only — no rendering details.
 */
export interface CustomComponentPromptEntry {
  /** The variant name the model must use verbatim as the `custom` block's `name`. */
  name: string;
  /** What the variant is for — one line, shown to the model. */
  description: string;
  /** Optional human-readable description of the `props` shape, e.g. `penColor: string, required: boolean`. */
  props?: string;
  /** Optional event names the variant emits, wired via `actions` (e.g. `["onCapture"]`). */
  actions?: string[];
}

export interface BuildSystemPromptOptions {
  /** Custom system prompt to merge with MDMA instructions. */
  customPrompt?: string;
  /**
   * Override the base MDMA author prompt. Defaults to the canonical
   * `MDMA_AUTHOR_PROMPT`. Use to swap in a model-specialized variant
   * (e.g. `MDMA_AUTHOR_PROMPT_HAIKU` from `./prompts/mdma-author/anthropic/haiku.js`).
   */
  authorPrompt?: string;
  /**
   * Host-registered custom components available for this request. When
   * provided, they are rendered as an "Available Custom Components" catalog so
   * the model can author `custom` blocks that reference them by `name`. Omit
   * (or pass empty) and the model is told no custom components are available.
   */
  customComponents?: CustomComponentPromptEntry[];
  /**
   * Host-registered external data sources. When provided, rendered as an
   * "Available data sources" catalog plus the rule to reference catalog data
   * with `{ source, params }` instead of generating rows. Omit (or pass empty)
   * and the prompt is unchanged.
   */
  dataSources?: DataSourceDescriptor[];
}

/** Render the host's custom-component catalog the model authors `custom` blocks against. */
function renderCustomCatalog(entries: CustomComponentPromptEntry[]): string {
  const items = entries
    .map((entry) => {
      const lines = [`- **${entry.name}** — ${entry.description}`];
      if (entry.props) lines.push(`  - props: ${entry.props}`);
      if (entry.actions?.length) lines.push(`  - actions: ${entry.actions.join(', ')}`);
      return lines.join('\n');
    })
    .join('\n');

  return `## Available Custom Components

The host has registered these custom components. To use one, emit a \`custom\` block whose \`name\` is EXACTLY one of the names below, place its inputs under \`props\` (only the documented keys), and wire any listed events under \`actions\`. Do NOT invent custom components or names that are not listed here, and prefer a built-in component type whenever one fits.

${items}`;
}

function renderDataSourceCatalog(sources: DataSourceDescriptor[]): string {
  const items = sources
    .map((source) => {
      const lines = [`- **${source.name}** (kind: ${source.kind})`];
      if (source.description) lines[0] += ` — ${source.description}`;
      if (source.columns?.length) {
        const columns = source.columns
          .map(
            (column) =>
              `${column.key}: ${column.type}${column.description ? ` (${column.description})` : ''}`,
          )
          .join(', ');
        lines.push(`  - columns: ${columns}`);
      }
      if (source.params?.length) {
        const params = source.params
          .map((param) => {
            const allowed = param.allowed?.length
              ? `, allowed: ${param.allowed.map((value) => JSON.stringify(value)).join(' | ')}`
              : '';
            return `${param.name}: ${param.type} (${param.required ? 'required' : 'optional'}${allowed})`;
          })
          .join('; ');
        lines.push(`  - params: ${params}`);
      }
      return lines.join('\n');
    })
    .join('\n');

  return `## Available data sources

The host exposes these external data sources. Data that a source provides is ALWAYS referenced with \`{ source: <name>, params: { ... } }\` — in a \`form\` select field's \`options\`, in \`table.data\`, or in \`chart.data\` — and is NEVER generated inline as rows, options, or CSV.

Sources:

${items}

Rules:
- Use only source names listed above. NEVER invent a source; if the request needs data no listed source provides, do not reference a source and do not fabricate the data — say the data is not available.
- \`table.columns[].key\` and chart \`xAxis\` / \`yAxis\` MUST be columns of the referenced source.
- Give each param only a value of its declared type, respecting \`allowed\` values, and always supply required params. A param value may be a \`{{binding}}\` to react to another component.

Example:

\`\`\`mdma
type: table
id: open-incidents
columns:
  - key: title
    header: Title
data:
  source: incidents
  params: { status: open }
\`\`\``;
}

/**
 * Build a complete system prompt that always includes MDMA formatting
 * instructions. When a custom prompt is provided, it is placed between
 * the MDMA specification and a closing reminder that reinforces critical
 * rules (thinking block, unique IDs, sensitive flags).
 *
 * This ensures that consumers never accidentally lose MDMA instructions
 * when providing their own system prompt.
 */
export function buildSystemPrompt(options: BuildSystemPromptOptions = {}): string {
  const { customPrompt, authorPrompt, customComponents, dataSources } = options;
  const author = authorPrompt ?? MDMA_AUTHOR_PROMPT;

  const catalog = customComponents?.length
    ? `\n\n---\n\n${renderCustomCatalog(customComponents)}`
    : '';
  const dataCatalog = dataSources?.length
    ? `\n\n---\n\n${renderDataSourceCatalog(dataSources)}`
    : '';
  const base = `${author}${catalog}${dataCatalog}`;

  if (!customPrompt) {
    return base;
  }

  return `${base}

---

${customPrompt}

---

Reminder — when generating MDMA components you MUST:
- Include a \`thinking\` block BEFORE the main content (status: done, collapsed: true).
- Use unique kebab-case IDs for every component.
- Mark PII fields with \`sensitive: true\`.
- NEVER mention thinking blocks, sensitive flags, bindings, component IDs, or any MDMA implementation details in your visible text. All reasoning goes inside the thinking block. The user should see a natural response, not meta-commentary about how the document is structured.
- Respond in plain Markdown — do NOT wrap the entire response in code fences.`;
}
