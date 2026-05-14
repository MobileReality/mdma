import { parse } from 'yaml';

/**
 * Custom promptfoo assertion for fixer eval.
 *
 * Finds a component in the fixed output and validates its fields against an
 * expected MDMA block provided in config.
 *
 * config:
 *   expected: string   — complete (or partial) MDMA block YAML to compare against.
 *                        The `id` field in the expected block is used to locate the
 *                        component in the output. Every field present in `expected`
 *                        must match the actual component — extra fields in the
 *                        actual output are ignored.
 *   hasFields: string[] — additional field names that must exist (any value).
 *
 * Example:
 *   config:
 *     expected: |
 *       type: webhook
 *       id: order-webhook
 *       url: https://api.example.com/orders
 *       method: POST
 *       trigger: order-form
 */
export default function (output, { config } = {}) {
  const { expected: expectedYaml, hasFields = [] } = config ?? {};

  if (!expectedYaml) {
    return { pass: false, score: 0, reason: 'No expected block provided in config' };
  }

  let expected;
  try {
    expected = parse(expectedYaml);
  } catch (e) {
    return { pass: false, score: 0, reason: `Could not parse expected block: ${e.message}` };
  }

  const id = expected?.id;
  if (!id) {
    return { pass: false, score: 0, reason: 'Expected block has no id field' };
  }

  // Extract raw YAML strings from each ```mdma block in the output
  const blocks = [];
  const blockRegex = /```mdma\n([\s\S]*?)```/g;
  let match;
  while ((match = blockRegex.exec(output)) !== null) {
    blocks.push(match[1]);
  }

  // Find and parse the block whose top-level id matches
  let actual = null;
  let actualRaw = null;
  for (const raw of blocks) {
    let parsed;
    try {
      parsed = parse(raw);
    } catch {
      continue;
    }
    if (parsed?.id === id) {
      actual = parsed;
      actualRaw = raw.trim();
      break;
    }
  }

  if (!actual) {
    return {
      pass: false,
      score: 0,
      reason: `Component "${id}" not found in output (${blocks.length} block(s) present)`,
    };
  }

  // Deep compare every field in expected against actual
  const failures = compareFields(expected, actual, '');

  // Check hasFields presence
  for (const field of hasFields) {
    if (actual[field] === undefined || actual[field] === null || actual[field] === '') {
      failures.push(`field "${field}" is missing or empty`);
    }
  }

  if (failures.length > 0) {
    return {
      pass: false,
      score: 0,
      reason: `Component "${id}" field mismatch:\n${failures.join('\n')}\n\nActual block:\n${actualRaw}`,
    };
  }

  return {
    pass: true,
    score: 1,
    reason: `Component "${id}" matches expected block`,
  };
}

function compareFields(expected, actual, prefix) {
  const failures = [];
  for (const [key, expectedVal] of Object.entries(expected)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const actualVal = actual?.[key];

    if (expectedVal === null || expectedVal === undefined) {
      // null in expected = presence check only
      if (actualVal === undefined || actualVal === null || actualVal === '') {
        failures.push(`"${path}" is missing or empty`);
      }
    } else if (Array.isArray(expectedVal)) {
      if (!Array.isArray(actualVal)) {
        failures.push(`"${path}" should be an array, got ${typeof actualVal}`);
      } else if (expectedVal.length !== actualVal.length) {
        failures.push(`"${path}" length: expected ${expectedVal.length}, got ${actualVal.length}`);
      } else {
        for (let i = 0; i < expectedVal.length; i++) {
          if (typeof expectedVal[i] === 'object' && expectedVal[i] !== null) {
            failures.push(...compareFields(expectedVal[i], actualVal[i] ?? {}, `${path}[${i}]`));
          } else if (expectedVal[i] !== actualVal[i]) {
            failures.push(`"${path}[${i}]": expected ${JSON.stringify(expectedVal[i])}, got ${JSON.stringify(actualVal[i])}`);
          }
        }
      }
    } else if (typeof expectedVal === 'object') {
      failures.push(...compareFields(expectedVal, actualVal ?? {}, path));
    } else if (actualVal !== expectedVal) {
      failures.push(`"${path}": expected ${JSON.stringify(expectedVal)}, got ${JSON.stringify(actualVal)}`);
    }
  }
  return failures;
}
