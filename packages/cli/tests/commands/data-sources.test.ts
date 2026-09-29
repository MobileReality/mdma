import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validate } from '@mobile-reality/mdma-validator';
import { buildPromptText } from '../../src/commands/prompt.js';
import { parseDataSources, toCatalog } from '../../src/commands/load-data-sources.js';

const catalogJson = JSON.stringify([
  {
    name: 'incidents',
    kind: 'rows',
    columns: [{ key: 'title', type: 'string' }],
    params: [{ name: 'status', type: 'string', required: true, allowed: ['open', 'closed'] }],
  },
]);

function writeTemp(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdma-cli-'));
  const file = path.join(dir, 'catalog.json');
  fs.writeFileSync(file, content);
  return file;
}

describe('data-source catalog file', () => {
  it('parses a descriptor array and keys it by name', () => {
    const catalog = toCatalog(parseDataSources(catalogJson));
    expect(Object.keys(catalog)).toEqual(['incidents']);
    expect(catalog.incidents.columns?.[0].key).toBe('title');
  });

  it('rejects an invalid catalog', () => {
    expect(() => parseDataSources('[{"kind":"rows"}]')).toThrow();
  });

  it('includes the catalog in the printed prompt', () => {
    const text = buildPromptText({ dataSources: writeTemp(catalogJson) });
    expect(text).toContain('## Available data sources');
    expect(text).toContain('**incidents** (kind: rows)');
  });

  it('prints the plain prompt without a catalog', () => {
    expect(buildPromptText({})).not.toContain('## Available data sources');
  });

  it('feeds the validator catalog so unknown sources are reported', () => {
    const markdown = `\`\`\`mdma
type: table
id: t
columns:
  - key: title
    header: Title
data:
  source: nope
\`\`\`
`;
    const catalog = toCatalog(parseDataSources(catalogJson));
    const result = validate(markdown, { autoFix: false, dataSourceCatalog: catalog });
    expect(result.issues.some((issue) => issue.ruleId === 'data-source')).toBe(true);
  });
});
