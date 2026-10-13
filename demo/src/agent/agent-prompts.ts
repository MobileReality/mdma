import {
  buildSystemPrompt,
  getAgentToolPromptVariant,
  getAuthorPromptVariant,
} from '@mobile-reality/mdma-prompt-pack';
import { GRAPH_3D_CATALOG_ENTRY } from '../custom-variants/Graph3DRenderer.js';
import type { AnthropicConfig } from './anthropic-client.js';
import { dataSourcesFor } from './data-source-options.js';

export type AgentPromptConfig = Pick<AnthropicConfig, 'systemPromptId' | 'externalDataSources'>;

/**
 * Host-registered custom components advertised to the model. Mirrors the
 * `customVariants` registered in custom-components.tsx — the model may only
 * emit a `custom` block whose `name` appears here.
 */
const CUSTOM_COMPONENTS = [GRAPH_3D_CATALOG_ENTRY];

/**
 * Demo-local agent rules, appended to this app's agent prompt only — NOT part
 * of the shared prompt-pack. They describe how THIS demo's registered custom
 * components must be wired, which is host knowledge, not MDMA spec.
 *
 * Why it exists: the agent emitted a `graph-3d` block with no `actions` map, so
 * clicking a bar could not reach the host — the component rendered but was
 * inert. It also narrated features the variant does not have ("zoom", "hover
 * tooltips", "category filtering", "reset-view button"), which reads as a
 * broken UI to the user.
 */
const DEMO_CUSTOM_COMPONENT_RULES = `## Wiring custom components in this app

!IMPORTANT: A \`custom\` block MUST include an \`actions\` map wiring EVERY event listed for that variant under "Available Custom Components". A custom block without \`actions\` is INCOMPLETE — the user's interaction cannot reach the host application, so the component renders but does nothing.

INCOMPLETE — \`graph-3d\` with no \`actions\` (do NOT emit this):

\`\`\`mdma
type: custom
id: sales-3d
name: graph-3d
props:
  data: |
    region, quarter, revenue
    North, Q1, 120
  x: region
  z: quarter
  y: revenue
\`\`\`

COMPLETE — every \`graph-3d\` block ends with an \`actions\` map:

\`\`\`mdma
type: custom
id: sales-3d
name: graph-3d
props:
  data: |
    region, quarter, revenue
    North, Q1, 120
  x: region
  z: quarter
  y: revenue
actions:
  onSelect: sales-bar-selected
\`\`\`

Before you finish, check every \`custom\` block you wrote has its \`actions\` map. If one is missing, add it.

Describe only what the variant actually documents. Do NOT tell the user about capabilities the variant does not list — no zoom, hover tooltips, category filtering, point-size controls, or reset-view buttons. Claiming absent features makes the rendered component look broken.`;

export function buildAuthorSubAgentPrompt(config: AgentPromptConfig): string {
  return buildSystemPrompt({
    authorPrompt: getAuthorPromptVariant(config.systemPromptId).prompt,
    customPrompt: DEMO_CUSTOM_COMPONENT_RULES,
    customComponents: CUSTOM_COMPONENTS,
    dataSources: dataSourcesFor(config),
  });
}

export function buildInlineAgentPrompt(config: AgentPromptConfig, flowPrompt?: string): string {
  const toolPrompt = getAgentToolPromptVariant(config.systemPromptId).prompt;
  return buildSystemPrompt({
    authorPrompt: getAuthorPromptVariant(config.systemPromptId).prompt,
    customPrompt: flowPrompt
      ? `${toolPrompt}\n\n---\n\n${DEMO_CUSTOM_COMPONENT_RULES}\n\n---\n\n${flowPrompt}`
      : `${toolPrompt}\n\n---\n\n${DEMO_CUSTOM_COMPONENT_RULES}`,
    customComponents: CUSTOM_COMPONENTS,
    dataSources: dataSourcesFor(config),
  });
}
