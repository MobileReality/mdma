/**
 * Asserts that the output contains binding expressions ({{ }}).
 */
export default function (output) {
  const bindingPattern = /\{\{[a-z][a-zA-Z0-9-]*\.[a-zA-Z0-9_.]+\}\}/g;
  const matches = output.match(bindingPattern) || [];

  if (matches.length > 0) {
    return { pass: true, score: 1, reason: `Found ${matches.length} binding(s): ${matches.slice(0, 3).join(', ')}` };
  }
  return { pass: false, score: 0, reason: 'No binding expressions ({{component.field}}) found' };
}
