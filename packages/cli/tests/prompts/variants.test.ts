import { validate } from '@mobile-reality/mdma-validator';
import { describe, expect, it } from 'vitest';
import { selectMasterPrompt } from '../../../../evals/select-prompt.mjs';
import { MASTER_PROMPT_HAIKU } from '../../src/prompts/anthropic/haiku.js';
import { MASTER_PROMPT_OPUS } from '../../src/prompts/anthropic/opus.js';
import { MASTER_PROMPT_SONNET_5_5 } from '../../src/prompts/anthropic/sonnet-5.5.js';
import { MASTER_PROMPT_SONNET } from '../../src/prompts/anthropic/sonnet.js';
import { MASTER_PROMPT_GEMMA } from '../../src/prompts/google/gemma.js';

const VARIANTS = {
  haiku: MASTER_PROMPT_HAIKU,
  opus: MASTER_PROMPT_OPUS,
  sonnet: MASTER_PROMPT_SONNET,
  'sonnet-5.5': MASTER_PROMPT_SONNET_5_5,
  gemma: MASTER_PROMPT_GEMMA,
};

describe.each(Object.entries(VARIANTS))('%s master prompt variant', (_name, prompt) => {
  it('lets table data, chart data and select options be a data-source ref', () => {
    const tableRow = prompt.split('\n').find((line) => line.startsWith('| table'));
    const chartRow = prompt.split('\n').find((line) => line.startsWith('| chart'));
    expect(tableRow).toContain('{ source, params }');
    expect(chartRow).toContain('{ source, params }');
    expect(prompt).toContain('`options` can instead be `{ source, params }`');
  });

  it('documents table sortable, filterable and pageSize and the custom envelope', () => {
    expect(prompt).toContain('`filterable`');
    expect(prompt).toContain('`pageSize`');
    expect(prompt).toMatch(/\| custom\s+\| `name`/);
  });

  it('describes data sources as definitions without data with rows, series and options kinds', () => {
    expect(prompt).toContain('## External Data Sources');
    expect(prompt).toContain('definition without data');
    expect(prompt).toMatch(/`rows`\s+\| `table`\s+\| `table\.data`/);
    expect(prompt).toMatch(/`series`\s+\| `chart`\s+\| `chart\.data`/);
    expect(prompt).toMatch(/`options`\s+\| `form` select field/);
    expect(prompt).toContain('the catalog holds two sources, a `rows` one and a `series` one');
  });

  it('states the one interactive component per message rule', () => {
    expect(prompt).toContain('One interactive component per message');
  });

  it('quotes numeric select values in every example block', () => {
    const blocks = prompt.match(/```mdma\n([\s\S]*?)```/g) ?? [];
    for (const block of blocks) {
      expect(block).not.toMatch(/^\s+value: \d+\s*$/m);
    }
  });

  it('shows data-source example blocks that pass the validator against a catalog', () => {
    const catalog = [
      {
        name: 'incidents',
        kind: 'rows' as const,
        columns: [
          { key: 'title', type: 'string' as const, sensitive: false },
          { key: 'severity', type: 'string' as const, sensitive: false },
        ],
        params: [{ name: 'status', type: 'string' as const, required: true }],
      },
      {
        name: 'incidents-by-day',
        kind: 'series' as const,
        columns: [
          { key: 'day', type: 'date' as const, sensitive: false },
          { key: 'count', type: 'number' as const, sensitive: false },
        ],
        params: [{ name: 'status', type: 'string' as const, required: true }],
      },
      { name: 'services', kind: 'options' as const },
    ];
    const refBlocks = (prompt.match(/```mdma\n([\s\S]*?)```/g) ?? []).filter((block) =>
      block.includes('source:'),
    );
    expect(refBlocks).toHaveLength(3);
    for (const block of refBlocks) {
      const result = validate(block, { autoFix: false, dataSourceCatalog: catalog });
      expect(result.summary.errors, JSON.stringify(result.issues)).toBe(0);
    }
  });
});

describe('thinking wording per Anthropic Sonnet variant', () => {
  it('sonnet-5.5 describes thinking as a plan summary and never asks for reasoning or analysis', () => {
    expect(MASTER_PROMPT_SONNET_5_5).toContain('plan summary');
    expect(MASTER_PROMPT_SONNET_5_5).toContain('a thinking block summarizing the plan');
    expect(MASTER_PROMPT_SONNET_5_5).not.toMatch(/analy[sz]/i);
    expect(MASTER_PROMPT_SONNET_5_5).not.toMatch(/reasoning/i);
  });

  it('sonnet-5.5 keeps the thinking block examples with their fields', () => {
    expect(MASTER_PROMPT_SONNET_5_5).toContain('type: thinking');
    expect(MASTER_PROMPT_SONNET_5_5).toContain('status: done');
    expect(MASTER_PROMPT_SONNET_5_5).toContain('collapsed: true');
  });

  it('leaves the other variants on their existing thinking wording', () => {
    for (const prompt of [MASTER_PROMPT_SONNET, MASTER_PROMPT_HAIKU, MASTER_PROMPT_GEMMA]) {
      expect(prompt).toContain('a thinking block analyzing the case');
      expect(prompt).not.toContain('plan summary');
    }
  });
});

describe('selectMasterPrompt routing', () => {
  const route = async (provider: string) => (await selectMasterPrompt(provider)).source;

  it('routes Sonnet 5.5 to its own variant under every provider spelling', async () => {
    expect(await route('openrouter:anthropic/claude-sonnet-5-5')).toBe('anthropic/sonnet-5.5');
    expect(await route('anthropic:messages:claude-sonnet-5-5')).toBe('anthropic/sonnet-5.5');
    expect(await route('openrouter:anthropic/claude-sonnet-5.5')).toBe('anthropic/sonnet-5.5');
  });

  it('serves the Sonnet 5.5 prompt for claude-sonnet-5-5', async () => {
    const { prompt } = await selectMasterPrompt('openrouter:anthropic/claude-sonnet-5-5');
    expect(prompt).toBe(MASTER_PROMPT_SONNET_5_5);
  });

  it('keeps other Claude ids on their existing variants', async () => {
    expect(await route('openrouter:anthropic/claude-sonnet-5')).toBe('anthropic/sonnet');
    expect(await route('openrouter:anthropic/claude-sonnet-4-5')).toBe('anthropic/sonnet');
    expect(await route('openrouter:anthropic/claude-opus-5-5')).toBe('anthropic/opus');
    expect(await route('openrouter:anthropic/claude-opus-5')).toBe('anthropic/opus');
    expect(await route('openrouter:anthropic/claude-haiku-5-5')).toBe('anthropic/haiku');
  });

  it('keeps non-Claude families on the default prompt', async () => {
    for (const provider of [
      'openrouter:google/gemini-3.8-flash',
      'openrouter:openai/gpt-6-sol',
      'openrouter:x-ai/grok-4.7',
    ]) {
      expect(await route(provider)).toMatch(/^default/);
    }
  });
});
