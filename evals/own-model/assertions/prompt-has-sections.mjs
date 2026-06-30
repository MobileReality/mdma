/**
 * Asserts that the generated customPrompt contains the expected structural sections.
 *
 * A well-structured customPrompt should include most of these elements:
 * - Domain/role context
 * - When to generate / trigger rules
 * - Component instructions
 * - Workflow or constraints
 *
 * Pass required section keywords via config.sections (array of regex patterns).
 * By default checks for broad structural markers.
 */
export default function (output, { config }) {
  const sections = config?.sections || [
    'domain|workflow|role|assist',
    'form|component|field',
    'sensitive|pii|personal',
  ];

  const lower = output.toLowerCase();
  const missing = [];

  for (const pattern of sections) {
    const regex = new RegExp(pattern, 'i');
    if (!regex.test(lower)) {
      missing.push(pattern);
    }
  }

  if (missing.length === 0) {
    return {
      pass: true,
      score: 1,
      reason: `All ${sections.length} expected section markers found`,
    };
  }

  return {
    pass: false,
    score: (sections.length - missing.length) / sections.length,
    reason: `Missing section markers: ${missing.join(', ')}`,
  };
}
