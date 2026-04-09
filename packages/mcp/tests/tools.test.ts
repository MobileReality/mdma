import { describe, it, expect } from 'vitest';
import { getSpec } from '../src/tools/get-spec.js';
import { getPrompt } from '../src/tools/get-prompt.js';
import { buildPrompt } from '../src/tools/build-system-prompt.js';
import { validatePrompt } from '../src/tools/validate-prompt.js';
import { listPackages } from '../src/tools/list-packages.js';

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
