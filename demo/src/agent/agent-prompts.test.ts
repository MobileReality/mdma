import { describe, expect, it } from 'vitest';
import { buildAuthorSubAgentPrompt, buildInlineAgentPrompt } from './agent-prompts.js';
import { dataSourcesFor, storeOptionsFor } from './data-source-options.js';

const CATALOG_HEADING = 'Available data sources';

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
