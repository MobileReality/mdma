import {
  MDMA_IL_AGENT_SYSTEM_PROMPT,
  buildSystemPrompt,
  getAgentToolPromptVariant,
  getAuthorPromptVariant,
} from '@mobile-reality/mdma-prompt-pack';
import type { DataSourceDefinition } from '@mobile-reality/mdma-spec';
import { GRAPH_3D_CATALOG_ENTRY } from '../custom-variants/Graph3DRenderer.js';
import type { AnthropicConfig } from './anthropic-client.js';
import { dataSourcesFor } from './data-source-options.js';

export type AgentPromptConfig = Pick<
  AnthropicConfig,
  'systemPromptId' | 'externalDataSources' | 'provider'
>;

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

function buildDataSourceDelegationSection(sources: readonly DataSourceDefinition[]): string {
  const catalog = sources
    .map((source) => `- \`${source.name}\` (${source.kind}) — ${source.description}`)
    .join('\n');
  return `## Available data sources

This app has prepared external data sources. The MDMA Author can bind a table, chart or select to one of them, so the data is fetched at render time instead of being written into the document.

${catalog}

Rules:
- When the user asks for a table, chart or select options over this kind of data, call \`generate_mdma\` and name the source (and any parameters it needs) in the brief.
- NEVER write MDMA blocks yourself and NEVER invent rows, series or options for data a source above covers.
- If no source above fits what the user asks for, say that the data is not available. Do not make it up.`;
}

function buildAgentToolPrompt(config: AgentPromptConfig, flowPrompt?: string): string {
  const toolPrompt = getAgentToolPromptVariant(config.systemPromptId).prompt;
  const sources = dataSourcesFor(config);
  const base = sources
    ? `${toolPrompt}\n\n---\n\n${buildDataSourceDelegationSection(sources)}`
    : toolPrompt;
  return flowPrompt ? `${base}\n\n---\n\n${flowPrompt}` : base;
}

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

export function buildConversationPrompt(
  config: AgentPromptConfig,
  useAuthorSubAgent: boolean,
  flowPrompt?: string,
): string {
  if (config.provider === 'own-model') {
    return flowPrompt
      ? `${MDMA_IL_AGENT_SYSTEM_PROMPT}\n\n---\n\n${flowPrompt}`
      : MDMA_IL_AGENT_SYSTEM_PROMPT;
  }
  return useAuthorSubAgent
    ? buildAgentToolPrompt(config, flowPrompt)
    : buildInlineAgentPrompt(config, flowPrompt);
}
