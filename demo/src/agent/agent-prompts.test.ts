import {
  MDMA_IL_AGENT_SYSTEM_PROMPT,
  getAgentToolPromptVariant,
} from '@mobile-reality/mdma-prompt-pack';
import { describe, expect, it } from 'vitest';
import { DEMO_DATA_SOURCES } from '../data-sources/catalog.js';
import {
  buildAuthorSubAgentPrompt,
  buildConversationPrompt,
  buildInlineAgentPrompt,
} from './agent-prompts.js';
import { dataSourcesFor, storeOptionsFor } from './data-source-options.js';

const CATALOG_HEADING = 'Available data sources';
const FLOW_PROMPT = 'flow rules';
const SUB_AGENT = true;

describe('external data sources toggle', () => {
  it('adds the catalog to the author sub-agent prompt when on', () => {
    const prompt = buildAuthorSubAgentPrompt({ externalDataSources: true });
    expect(prompt).toContain(CATALOG_HEADING);
    expect(prompt).toContain('sales-by-month');
  });

  it('adds the catalog to the inline agent prompt when on', () => {
    expect(buildInlineAgentPrompt({ externalDataSources: true }, 'flow rules')).toContain(
      CATALOG_HEADING,
    );
  });

  it('leaves both prompts without the catalog when off', () => {
    expect(buildAuthorSubAgentPrompt({})).not.toContain(CATALOG_HEADING);
    expect(buildAuthorSubAgentPrompt({ externalDataSources: false })).not.toContain(
      CATALOG_HEADING,
    );
    expect(buildInlineAgentPrompt({})).not.toContain(CATALOG_HEADING);
  });

  it('gives document stores the resolvers only when on', () => {
    expect(dataSourcesFor({})).toBeUndefined();
    expect(storeOptionsFor({ externalDataSources: false })).toBeUndefined();
    expect(storeOptionsFor({ externalDataSources: true })?.dataSources).toHaveLength(3);
  });
});

describe('author sub-agent conversation prompt', () => {
  const toolPrompt = getAgentToolPromptVariant(undefined).prompt;

  it('names the catalog and every source when on', () => {
    const prompt = buildConversationPrompt({ externalDataSources: true }, SUB_AGENT);
    expect(prompt).toContain(CATALOG_HEADING);
    for (const source of DEMO_DATA_SOURCES) {
      expect(prompt).toContain(`\`${source.name}\``);
      expect(prompt).toContain(source.description);
    }
  });

  it('tells the conversation agent to delegate to generate_mdma instead of inventing data', () => {
    const prompt = buildConversationPrompt({ externalDataSources: true }, SUB_AGENT);
    expect(prompt).toContain('call `generate_mdma`');
    expect(prompt).toContain('NEVER invent rows');
    expect(prompt).toContain('the data is not available');
  });

  it('leaves the tool prompt byte-identical when off', () => {
    expect(buildConversationPrompt({}, SUB_AGENT)).toBe(toolPrompt);
    expect(buildConversationPrompt({ externalDataSources: false }, SUB_AGENT)).toBe(toolPrompt);
    expect(buildConversationPrompt({}, SUB_AGENT, FLOW_PROMPT)).toBe(
      `${toolPrompt}\n\n---\n\n${FLOW_PROMPT}`,
    );
  });

  it('keeps the catalog and the flow prompt together when a flow prompt is given', () => {
    const prompt = buildConversationPrompt({ externalDataSources: true }, SUB_AGENT, FLOW_PROMPT);
    expect(prompt).toContain(CATALOG_HEADING);
    expect(prompt.startsWith(toolPrompt)).toBe(true);
    expect(prompt.endsWith(FLOW_PROMPT)).toBe(true);
  });

  it('does not touch the inline or own-model prompts', () => {
    expect(buildConversationPrompt({ externalDataSources: true }, false, FLOW_PROMPT)).toBe(
      buildInlineAgentPrompt({ externalDataSources: true }, FLOW_PROMPT),
    );
    expect(
      buildConversationPrompt({ provider: 'own-model', externalDataSources: true }, SUB_AGENT),
    ).toBe(MDMA_IL_AGENT_SYSTEM_PROMPT);
  });
});
