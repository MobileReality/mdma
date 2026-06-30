/**
 * Asserts that the response does not leak raw YAML syntax in visible text.
 *
 * MDMA YAML (type:, id:, sensitive:, fields:, etc.) should only appear inside
 * fenced ```mdma blocks, never in the prose the user sees. This catches cases
 * where the model dumps component internals outside of code fences.
 */
export default function (output) {
  // Strip all fenced code blocks (mdma or otherwise) to get only visible text
  const visibleText = output.replace(/```[\s\S]*?```/g, '');

  // YAML-like patterns that should never appear in visible prose
  const yamlPatterns = [
    /^type:\s*(form|button|tasklist|table|chart|callout|approval-gate|webhook|thinking)\b/m,
    /^id:\s*[a-z][a-z0-9-]+$/m,
    /^sensitive:\s*(true|false)$/m,
    /^fields:\s*$/m,
    /^columns:\s*$/m,
    /^onSubmit:\s*/m,
    /^onAction:\s*/m,
    /^requiredApprovers:\s*\d+$/m,
    /^variant:\s*(primary|secondary|danger|ghost|info|warning|error|success|line|bar|area|pie)\b/m,
  ];

  const leaks = [];
  for (const pattern of yamlPatterns) {
    const match = visibleText.match(pattern);
    if (match) {
      leaks.push(match[0].trim());
    }
  }

  if (leaks.length === 0) {
    return { pass: true, score: 1, reason: 'No YAML leaked in visible text' };
  }

  return {
    pass: false,
    score: 0,
    reason: `Raw YAML leaked in visible text: ${leaks.join(', ')}`,
  };
}
