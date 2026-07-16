import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  type CustomComponentPromptEntry,
} from '../src/build-system-prompt.js';

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
