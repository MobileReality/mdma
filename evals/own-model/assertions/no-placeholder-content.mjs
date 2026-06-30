/**
 * Custom promptfoo assertion that checks for placeholder content
 * in visible text and mdma blocks (excluding thinking blocks).
 *
 * Thinking blocks may mention placeholders as part of reasoning —
 * that's fine. We only care about placeholders in rendered content.
 */
const PLACEHOLDER_PATTERNS = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /\bLorem\s*ipsum\b/i,
  /^\.{3,}$/m,
];

export default function (output) {
  // Extract mdma blocks and classify them
  const blocks = [...output.matchAll(/```mdma\s*([\s\S]*?)```/g)];

  for (const block of blocks) {
    const yaml = block[1];
    // Skip thinking blocks
    if (/^\s*type:\s*thinking\b/m.test(yaml)) continue;

    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(yaml)) {
        const match = yaml.match(pattern);
        return {
          pass: false,
          score: 0,
          reason: `Placeholder content "${match[0]}" found in mdma block`,
        };
      }
    }
  }

  // Check visible prose (everything outside mdma blocks)
  const prose = output.replace(/```mdma[\s\S]*?```/g, '');
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(prose)) {
      const match = prose.match(pattern);
      return {
        pass: false,
        score: 0,
        reason: `Placeholder content "${match[0]}" found in visible text`,
      };
    }
  }

  return {
    pass: true,
    score: 1,
    reason: 'No placeholder content found in visible output',
  };
}
