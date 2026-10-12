import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DataSourceDescriptor } from '@mobile-reality/mdma-spec';
import { describe, expect, it } from 'vitest';
import { buildFixerMessage, type FixerIssue } from '../src/prompts/mdma-fixer/_shared.js';

const fixerDir = join(fileURLToPath(new URL('.', import.meta.url)), '../src/prompts/mdma-fixer');

function variantFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return variantFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.startsWith('_') ? [path] : [];
  });
}

const dataSources: DataSourceDescriptor[] = [
  {
    name: 'incidents',
    description: 'Operational incidents.',
    kind: 'rows',
    columns: [{ key: 'title', type: 'string', sensitive: false }],
    params: [{ name: 'status', type: 'string', required: true, allowed: ['open', 'resolved'] }],
  },
];

const issues: FixerIssue[] = [
  {
    ruleId: 'data-source',
    severity: 'error',
    message: 'unknown data source "tickets"',
    componentId: 'open-incidents',
    field: 'data',
  },
];

describe('buildFixerMessage dataSources', () => {
  it('appends the catalog only when dataSources are given', () => {
    const withCatalog = buildFixerMessage('doc', issues, { dataSources });
    expect(withCatalog).toContain('## Available data sources');
    expect(withCatalog).toContain('**incidents** (kind: rows)');
    expect(withCatalog).toContain('status: string (required, allowed: "open" | "resolved")');
    expect(withCatalog.endsWith('---\n\ndoc')).toBe(true);
  });

  it('is unchanged without dataSources', () => {
    const plain = buildFixerMessage('doc', issues);
    expect(plain).not.toContain('## Available data sources');
    expect(buildFixerMessage('doc', issues, { dataSources: [] })).toBe(plain);
    expect(buildFixerMessage('doc', issues, {})).toBe(plain);
  });
});

describe('fixer data-source rules', () => {
  const files = variantFiles(fixerDir);

  it('discovers every fixer variant', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files.map((file) => [file.slice(fixerDir.length + 1), file]))(
    '%s teaches data-source repair',
    async (_name, file) => {
      const mod = await import(file);
      const prompts = Object.values(mod).filter((v): v is string => typeof v === 'string');
      expect(prompts.length).toBeGreaterThan(0);
      const prompt = prompts.reduce((a, b) => (b.length > a.length ? b : a));
      expect(prompt).toContain('## Data Source Fixes');
      expect(prompt).toContain('NEVER invent a source');
      expect(prompt).toContain('NEVER replace a `{ source, params }` ref with inline rows');
      expect(prompt).toContain('`data-source` issue on a select field');
      expect(prompt).toContain('`data-source` issue on `table.data` or `chart.data`');
    },
  );
});
