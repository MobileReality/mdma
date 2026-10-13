import { validate } from '@mobile-reality/mdma-validator';
import { describe, expect, it } from 'vitest';
import { MASTER_PROMPT } from '../../src/prompts/master-prompt.js';

describe('MASTER_PROMPT content', () => {
  it('should enforce YAML format, not JSON', () => {
    expect(MASTER_PROMPT).toContain('YAML');
    expect(MASTER_PROMPT).toContain('never JSON');
  });

  it('should contain all required output structure sections', () => {
    expect(MASTER_PROMPT).toContain('Role & Domain');
    expect(MASTER_PROMPT).toContain('Conversation Flow');
    expect(MASTER_PROMPT).toContain('Document Purpose');
    expect(MASTER_PROMPT).toContain('Component Instructions');
    expect(MASTER_PROMPT).toContain('Workflow Logic');
    expect(MASTER_PROMPT).toContain('MDMA Examples');
    expect(MASTER_PROMPT).toContain('Constraints');
  });

  it('should include a YAML example with fenced mdma block', () => {
    expect(MASTER_PROMPT).toContain('```mdma');
    expect(MASTER_PROMPT).toContain('type: form');
    expect(MASTER_PROMPT).toContain('type: approval-gate');
  });

  it('should show proper YAML field syntax in the example', () => {
    expect(MASTER_PROMPT).toContain('fields:');
    expect(MASTER_PROMPT).toContain('  - name:');
    expect(MASTER_PROMPT).toContain('    type: text');
    expect(MASTER_PROMPT).toContain('    label:');
    expect(MASTER_PROMPT).toContain('    required: true');
    expect(MASTER_PROMPT).toContain('    sensitive: true');
  });

  it('should NOT contain JSON-style component definitions in mdma code blocks', () => {
    // Extract content inside ```mdma ... ``` blocks
    const mdmaBlocks = MASTER_PROMPT.match(/```mdma\n([\s\S]*?)```/g) ?? [];
    expect(mdmaBlocks.length).toBeGreaterThan(0);
    for (const block of mdmaBlocks) {
      expect(block).not.toContain('{"type":');
      expect(block).not.toContain('"type": "form"');
      expect(block).not.toContain('"fields": [');
      // Verify each block starts with YAML key: value syntax
      const content = block
        .replace(/```mdma\n/, '')
        .replace(/```$/, '')
        .trim();
      expect(content).toMatch(/^type: /);
    }
  });

  it('should instruct not to repeat the MDMA spec', () => {
    expect(MASTER_PROMPT).toContain('MUST NOT');
    expect(MASTER_PROMPT).toContain('Repeat the MDMA component schemas');
    expect(MASTER_PROMPT).toContain('Repeat the base authoring rules');
  });

  it('should reference customPrompt architecture', () => {
    expect(MASTER_PROMPT).toContain('customPrompt');
    expect(MASTER_PROMPT).toContain('buildSystemPrompt');
    expect(MASTER_PROMPT).toContain('concatenated AFTER the full MDMA spec');
  });

  it('should include conversation flow instructions', () => {
    expect(MASTER_PROMPT).toContain('conversation flow');
    expect(MASTER_PROMPT).toContain('multi-step');
    expect(MASTER_PROMPT).toContain('form submission');
  });

  it('should contain all important rules', () => {
    expect(MASTER_PROMPT).toContain('Be specific');
    expect(MASTER_PROMPT).toContain('Strict component scope');
    expect(MASTER_PROMPT).toContain('Be complete');
    expect(MASTER_PROMPT).toContain('Be concise');
    expect(MASTER_PROMPT).toContain('Respect the architecture');
    expect(MASTER_PROMPT).toContain('Use YAML, never JSON');
  });
});

describe('MASTER_PROMPT component field tables', () => {
  it('lets table and chart data be a data-source ref', () => {
    const tableRow = MASTER_PROMPT.split('\n').find((line) => line.startsWith('| table'));
    const chartRow = MASTER_PROMPT.split('\n').find((line) => line.startsWith('| chart'));
    expect(tableRow).toContain('{ source, params }');
    expect(chartRow).toContain('{ source, params }');
  });

  it('lets select options be a data-source ref and keeps values quoted', () => {
    expect(MASTER_PROMPT).toContain('`options` can instead be `{ source, params }`');
    expect(MASTER_PROMPT).toContain('`value: "1"`');
  });

  it('documents table sortable, filterable and pageSize', () => {
    expect(MASTER_PROMPT).toContain('`sortable`');
    expect(MASTER_PROMPT).toContain('`filterable`');
    expect(MASTER_PROMPT).toContain('`pageSize`');
  });

  it('documents the custom envelope as a standalone component', () => {
    expect(MASTER_PROMPT).toMatch(/\| custom\s+\| `name`/);
    expect(MASTER_PROMPT).toContain('NEVER a form field `type`');
    expect(MASTER_PROMPT).toContain('`props`');
    expect(MASTER_PROMPT).toContain('`actions`');
  });
});

describe('MASTER_PROMPT external data sources', () => {
  it('describes catalog entries as definitions without data', () => {
    expect(MASTER_PROMPT).toContain('## External Data Sources');
    expect(MASTER_PROMPT).toContain('definition without data');
    expect(MASTER_PROMPT).toContain('"Available data sources" catalog');
  });

  it('maps each source kind to the slot it feeds', () => {
    expect(MASTER_PROMPT).toMatch(/`rows`\s+\| `table`\s+\| `table\.data`/);
    expect(MASTER_PROMPT).toMatch(/`series`\s+\| `chart`\s+\| `chart\.data`/);
    expect(MASTER_PROMPT).toMatch(/`options`\s+\| `form` select field/);
  });

  it('asks for a rows and a series source when data is needed as both', () => {
    expect(MASTER_PROMPT).toContain(
      'the catalog holds two sources, a `rows` one and a `series` one',
    );
  });

  it('forbids inline rows and invented sources', () => {
    expect(MASTER_PROMPT).toContain('NEVER invent one');
    expect(MASTER_PROMPT).toContain('Reference data sources, never inline their data');
  });

  it('shows data-source examples that pass the validator against a catalog', () => {
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
    const refBlocks = (MASTER_PROMPT.match(/```mdma\n([\s\S]*?)```/g) ?? []).filter((block) =>
      block.includes('source:'),
    );
    expect(refBlocks).toHaveLength(3);
    for (const block of refBlocks) {
      const result = validate(block, { autoFix: false, dataSourceCatalog: catalog });
      expect(result.summary.errors, JSON.stringify(result.issues)).toBe(0);
    }
  });
});

describe('MASTER_PROMPT interactive component rule', () => {
  it('states the one interactive component per message rule', () => {
    expect(MASTER_PROMPT).toContain('One interactive component per message');
  });

  it('does not put an approval gate and a tasklist in the same example step', () => {
    expect(MASTER_PROMPT).not.toContain('Step 2: approval-gate + tasklist');
    expect(MASTER_PROMPT).toContain('**Step 3 — Verification Checklist**');
  });
});
