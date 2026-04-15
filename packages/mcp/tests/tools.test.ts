import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSpec } from '../src/tools/get-spec.js';
import { getPrompt } from '../src/tools/get-prompt.js';
import { buildPrompt } from '../src/tools/build-system-prompt.js';
import { validatePrompt } from '../src/tools/validate-prompt.js';
import { listPackages } from '../src/tools/list-packages.js';
import { listDocs, getDoc, isAllowedPath } from '../src/tools/get-doc.js';

describe('get-spec', () => {
  it('returns spec with all 9 component types', () => {
    const spec = getSpec();
    expect(spec.specVersion).toBe('0.2.0');
    expect(spec.langTag).toBe('mdma');
    expect(spec.componentTypes).toHaveLength(9);
    expect(spec.componentTypes).toContain('form');
    expect(spec.componentTypes).toContain('approval-gate');
    expect(spec.componentTypes).toContain('chart');
  });

  it('includes JSON Schema for each component', () => {
    const spec = getSpec();
    for (const type of spec.componentTypes) {
      expect(spec.components[type]).toBeDefined();
    }
  });

  it('includes base fields and binding syntax', () => {
    const spec = getSpec();
    expect(spec.baseFields).toBeDefined();
    expect(spec.bindingSyntax.description).toContain('{{');
    expect(spec.bindingSyntax.examples.length).toBeGreaterThan(0);
  });

  it('includes authoring rules', () => {
    const spec = getSpec();
    expect(spec.authoringRules.length).toBeGreaterThanOrEqual(5);
    expect(spec.authoringRules.some((r) => r.includes('kebab-case'))).toBe(true);
  });
});

describe('get-prompt', () => {
  it('returns author prompt', () => {
    const result = getPrompt('mdma-author');
    expect('content' in result).toBe(true);
    if ('content' in result) {
      expect(result.content).toContain('MDMA');
    }
  });

  it('returns reviewer prompt', () => {
    const result = getPrompt('mdma-reviewer');
    expect('content' in result).toBe(true);
  });

  it('returns error for unknown prompt', () => {
    const result = getPrompt('nonexistent');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('Unknown prompt');
      expect(result.error).toContain('mdma-author');
    }
  });
});

describe('build-system-prompt', () => {
  it('returns empty string without any input', () => {
    const prompt = buildPrompt({});
    expect(prompt).toBe('');
  });

  it('builds custom prompt from domain', () => {
    const prompt = buildPrompt({ domain: 'HR onboarding' });
    expect(prompt).toContain('HR onboarding');
    expect(prompt).not.toContain('## Document Format'); // no base spec
  });

  it('builds custom prompt from components list', () => {
    const prompt = buildPrompt({ components: ['form', 'approval-gate'] });
    expect(prompt).toContain('form, approval-gate');
  });

  it('builds custom prompt from field definitions', () => {
    const prompt = buildPrompt({
      fields: [
        { name: 'email', type: 'email', sensitive: true, required: true },
        { name: 'department', type: 'select', options: ['Engineering', 'Marketing'] },
      ],
    });
    expect(prompt).toContain('email');
    expect(prompt).toContain('sensitive: true');
    expect(prompt).toContain('Engineering');
  });

  it('builds custom prompt from flow steps', () => {
    const prompt = buildPrompt({
      steps: [
        { label: 'Registration', description: 'User fills in details' },
        { label: 'Approval', description: 'Manager reviews' },
      ],
    });
    expect(prompt).toContain('Registration');
    expect(prompt).toContain('Manager reviews');
    expect(prompt).toContain('SEPARATE conversation message');
  });

  it('includes business rules', () => {
    const prompt = buildPrompt({ businessRules: 'Expenses over $500 require VP approval' });
    expect(prompt).toContain('Expenses over $500');
  });

  it('flags invalid component types', () => {
    const prompt = buildPrompt({ components: ['form', 'card', 'wizard'] });
    expect(prompt).toContain('form');
    expect(prompt).toContain('card');
    expect(prompt).toContain('excluded');
  });
});

describe('validate-prompt', () => {
  it('passes a well-formed prompt', () => {
    const result = validatePrompt(
      'Generate a form component with kebab-case id. Mark email fields as sensitive: true.',
    );
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('warns about markdown fence wrapping', () => {
    const result = validatePrompt('Wrap your output in a markdown code fence');
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.includes('markdown fences'))).toBe(true);
  });

  it('warns about JSON output', () => {
    const result = validatePrompt('Output the form in JSON format');
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.includes('JSON'))).toBe(true);
  });

  it('suggests PII awareness when missing', () => {
    const result = validatePrompt('Create a form with email and phone fields');
    expect(result.suggestions.some((s) => s.includes('sensitive'))).toBe(true);
  });

  it('suggests adding mdma examples', () => {
    const result = validatePrompt('Create a form component');
    expect(result.suggestions.some((s) => s.includes('```mdma'))).toBe(true);
  });
});

describe('list-packages', () => {
  it('returns all packages', () => {
    const packages = listPackages();
    expect(packages.length).toBeGreaterThanOrEqual(9);
  });

  it('each package has required fields', () => {
    for (const pkg of listPackages()) {
      expect(pkg.name).toMatch(/^@mobile-reality\/mdma-/);
      expect(pkg.purpose.length).toBeGreaterThan(10);
      expect(pkg.install.length).toBeGreaterThan(0);
      expect(pkg.usage.length).toBeGreaterThan(0);
      expect(['core', 'rendering', 'ai', 'tooling']).toContain(pkg.category);
    }
  });

  it('includes the mcp package itself', () => {
    const packages = listPackages();
    expect(packages.some((p) => p.name === '@mobile-reality/mdma-mcp')).toBe(true);
  });
});

describe('list-docs', () => {
  it('returns a non-empty catalog', () => {
    const docs = listDocs();
    expect(docs.length).toBeGreaterThan(0);
  });

  it('every entry has path, title, description', () => {
    for (const doc of listDocs()) {
      expect(doc.path).toMatch(/\.md$/);
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.description.length).toBeGreaterThan(10);
    }
  });

  it('includes the README and the quick-start guide', () => {
    const paths = listDocs().map((d) => d.path);
    expect(paths).toContain('README.md');
    expect(paths).toContain('docs/getting-started/quick-start.md');
  });
});

describe('isAllowedPath', () => {
  it('accepts catalog entries', () => {
    expect(isAllowedPath('README.md')).toBe(true);
    expect(isAllowedPath('docs/getting-started/quick-start.md')).toBe(true);
  });

  it('accepts any *.md under docs/ or blueprints/', () => {
    expect(isAllowedPath('docs/whatever/new-guide.md')).toBe(true);
    expect(isAllowedPath('blueprints/kyc-case/README.md')).toBe(true);
  });

  it('rejects path traversal', () => {
    expect(isAllowedPath('../etc/passwd')).toBe(false);
    expect(isAllowedPath('docs/../../secret.md')).toBe(false);
  });

  it('rejects absolute paths', () => {
    expect(isAllowedPath('/etc/passwd')).toBe(false);
  });

  it('rejects non-markdown files outside the catalog', () => {
    expect(isAllowedPath('docs/foo.json')).toBe(false);
    expect(isAllowedPath('package.json')).toBe(false);
  });

  it('rejects empty path', () => {
    expect(isAllowedPath('')).toBe(false);
  });
});

describe('get-doc', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('rejects disallowed paths without making a network request', async () => {
    const result = await getDoc('../secret');
    expect('error' in result).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('fetches from raw.githubusercontent.com on the main branch by default', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '# Quick Start\n\nHello',
    });
    const result = await getDoc('docs/getting-started/quick-start.md');
    expect('content' in result).toBe(true);
    if ('content' in result) {
      expect(result.ref).toBe('main');
      expect(result.url).toBe(
        'https://raw.githubusercontent.com/MobileReality/mdma/main/docs/getting-started/quick-start.md',
      );
      expect(result.content).toContain('Quick Start');
    }
  });

  it('honours a custom ref', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => 'tagged',
    });
    const result = await getDoc('README.md', 'v0.2.0');
    if ('content' in result) {
      expect(result.url).toContain('/v0.2.0/');
    }
  });

  it('returns an error on non-2xx responses', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => '',
    });
    const result = await getDoc('README.md');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('404');
    }
  });

  it('returns an error on network failure', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENETUNREACH'));
    const result = await getDoc('README.md');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toContain('ENETUNREACH');
    }
  });
});
