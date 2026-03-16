import { describe, it, expect } from 'vitest';
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
      const content = block.replace(/```mdma\n/, '').replace(/```$/, '').trim();
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
