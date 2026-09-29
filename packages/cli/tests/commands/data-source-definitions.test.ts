import { describe, it, expect, vi } from 'vitest';
import { defineDataSource } from '@mobile-reality/mdma-spec';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import { validate } from '@mobile-reality/mdma-validator';

const accounts = defineDataSource({
  name: 'accounts',
  description: 'Customer accounts',
  kind: 'rows',
  columns: [{ key: 'name', type: 'string' }],
  resolve: async () => ({ rows: [{ name: 'Acme' }], total: 1 }),
});

const sources = [accounts];

function tableMarkdown(source: string): string {
  return `\`\`\`mdma
type: table
id: t
columns:
  - key: name
    header: Name
data:
  source: ${source}
\`\`\`
`;
}

function tableAst(source: string): MdmaRoot {
  return {
    type: 'root',
    children: [
      {
        type: 'mdmaBlock',
        rawYaml: '',
        component: {
          id: 't',
          type: 'table',
          sensitive: false,
          disabled: false,
          visible: true,
          columns: [{ key: 'name', header: 'Name' }],
          data: { source },
        },
      },
    ],
  } as unknown as MdmaRoot;
}

describe('one DataSourceDefinition array drives prompt, store and validator', () => {
  it('lists the source in the prompt', () => {
    const prompt = buildSystemPrompt({ dataSources: sources });
    expect(prompt).toContain('**accounts** (kind: rows)');
  });

  it('fetches through the definition resolver in the store', async () => {
    const store = createDocumentStore(tableAst('accounts'), { dataSources: sources });
    await vi.waitFor(() => {
      expect(store.getDataState('t')?.status).toBe('ready');
    });
    expect(store.getDataState('t')?.rows).toEqual([{ name: 'Acme' }]);
  });

  it('accepts a known source and rejects an unknown one in the validator', () => {
    const known = validate(tableMarkdown('accounts'), {
      autoFix: false,
      dataSourceCatalog: sources,
    });
    expect(known.issues.filter((issue) => issue.ruleId === 'data-source')).toEqual([]);

    const unknown = validate(tableMarkdown('nope'), {
      autoFix: false,
      dataSourceCatalog: sources,
    });
    expect(unknown.issues.some((issue) => issue.ruleId === 'data-source')).toBe(true);
  });

  it('rejects duplicate names at every API boundary', () => {
    const duplicated = [accounts, accounts];
    expect(() => buildSystemPrompt({ dataSources: duplicated })).toThrow(/Duplicate data source/);
    expect(() => createDocumentStore(tableAst('accounts'), { dataSources: duplicated })).toThrow(
      /Duplicate data source/,
    );
    expect(() => validate(tableMarkdown('accounts'), { dataSourceCatalog: duplicated })).toThrow(
      /Duplicate data source/,
    );
  });
});
