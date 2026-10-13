import { describe, it, expect } from 'vitest';
import type { DataSourceDescriptor } from '@mobile-reality/mdma-spec';
import { buildSystemPrompt, type CustomComponentPromptEntry } from '../src/build-system-prompt.js';
import { MDMA_AUTHOR_PROMPT } from '../src/prompts/mdma-author/default.js';

const variants: CustomComponentPromptEntry[] = [
  {
    name: 'signature-pad',
    description: 'Capture a drawn signature.',
    props: 'penColor: string, required: boolean',
    actions: ['onCapture'],
  },
  { name: 'map-picker', description: 'Pick a location on a map.' },
];

describe('buildSystemPrompt', () => {
  it('documents the custom envelope in the base prompt', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('### 10. custom');
    expect(prompt).toContain('10 component types');
  });

  it('omits the catalog section when no custom components are provided', () => {
    // The base prompt references the phrase in guidance, but the catalog itself
    // is a `## Available Custom Components` heading — absent without entries.
    expect(buildSystemPrompt()).not.toContain('## Available Custom Components');
    expect(buildSystemPrompt({ customComponents: [] })).not.toContain(
      '## Available Custom Components',
    );
  });

  it('renders the catalog with each variant name, description, props and actions', () => {
    const prompt = buildSystemPrompt({ customComponents: variants });
    expect(prompt).toContain('## Available Custom Components');
    expect(prompt).toContain('**signature-pad** — Capture a drawn signature.');
    expect(prompt).toContain('props: penColor: string, required: boolean');
    expect(prompt).toContain('actions: onCapture');
    expect(prompt).toContain('**map-picker** — Pick a location on a map.');
  });

  it('keeps the catalog when a custom prompt is also supplied', () => {
    const prompt = buildSystemPrompt({
      customComponents: variants,
      customPrompt: 'House style: be terse.',
    });
    expect(prompt).toContain('## Available Custom Components');
    expect(prompt).toContain('House style: be terse.');
  });
});

describe('buildSystemPrompt dataSources', () => {
  const dataSources: DataSourceDescriptor[] = [
    {
      name: 'incidents',
      description: 'Open and closed incidents.',
      kind: 'rows',
      columns: [
        { key: 'title', type: 'string', sensitive: false },
        { key: 'service', type: 'string', description: 'owning service', sensitive: false },
      ],
      params: [
        { name: 'status', type: 'string', required: true, allowed: ['open', 'closed'] },
        { name: 'service', type: 'string', required: false },
      ],
    },
    { name: 'countries', kind: 'options' },
  ];

  it('is unchanged without dataSources', () => {
    expect(buildSystemPrompt({ dataSources: [] })).toBe(buildSystemPrompt());
    expect(buildSystemPrompt()).toBe(MDMA_AUTHOR_PROMPT);
    expect(buildSystemPrompt()).not.toContain('## Available data sources');
  });

  it('renders the catalog with columns and params', () => {
    const prompt = buildSystemPrompt({ dataSources });
    expect(prompt).toContain('## Available data sources');
    expect(prompt).toContain('**incidents** (kind: rows) — Open and closed incidents.');
    expect(prompt).toContain('columns: title: string, service: string (owning service)');
    expect(prompt).toContain('status: string (required, allowed: "open" | "closed")');
    expect(prompt).toContain('service: string (optional)');
    expect(prompt).toContain('**countries** (kind: options)');
  });

  it('adds the source-reference rule', () => {
    const prompt = buildSystemPrompt({ dataSources });
    expect(prompt).toContain('NEVER invent a source');
    expect(prompt).toContain('`table.columns[].key`');
    expect(prompt).toContain('`{{binding}}`');
  });

  it('documents the source ref in the base spec', () => {
    expect(buildSystemPrompt()).toContain('{ source: <source-name>');
  });

  it('composes with a custom prompt', () => {
    const prompt = buildSystemPrompt({ dataSources, customPrompt: 'Be terse.' });
    expect(prompt).toContain('## Available data sources');
    expect(prompt).toContain('Be terse.');
  });
});
