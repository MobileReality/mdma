import { validateConversation } from '@mobile-reality/mdma-validator';

/**
 * Custom promptfoo assertion for the conversation-judge eval.
 *
 * Required:
 *   - `vars.expectedJudgment` — 'valid' | 'invalid'
 *
 * Optional per-test config:
 *   - `expectedRules: string[]` — when expectedJudgment is 'invalid',
 *     rule names that MUST appear in the LLM judge's issues array.
 *
 * Optional cross-check (turned on when `vars.steps` is provided):
 *   - Runs `validateConversation()` on the assistant messages with the
 *     given step definition. Asserts the deterministic validator agrees
 *     with both `vars.expectedJudgment` AND the LLM judge.
 *
 * Passes only when every check it ran agrees. Fails on the first
 * disagreement and reports what was off (LLM, validator, or both).
 */
export default function (output, context) {
  const vars = context?.vars ?? {};
  const config = context?.config ?? {};
  const expectedJudgment = vars.expectedJudgment;

  if (expectedJudgment !== 'valid' && expectedJudgment !== 'invalid') {
    return {
      pass: false,
      score: 0,
      reason: `Test missing or invalid vars.expectedJudgment (got: ${JSON.stringify(expectedJudgment)})`,
    };
  }

  // --- Parse the LLM judge's JSON output ---
  const fencedMatch = output.match(/```(?:json)?\s*\n?(\{[\s\S]*?\})\s*\n?```/);
  const candidate = fencedMatch ? fencedMatch[1] : output.trim();

  let judgment;
  try {
    judgment = JSON.parse(candidate);
  } catch (err) {
    return {
      pass: false,
      score: 0,
      reason: `Judge output is not valid JSON: ${err.message}\nOutput (first 300 chars): ${output.slice(0, 300)}`,
    };
  }
  if (typeof judgment?.valid !== 'boolean' || !Array.isArray(judgment.issues)) {
    return {
      pass: false,
      score: 0,
      reason: `Judge JSON missing required fields (boolean "valid" and array "issues")`,
    };
  }

  const expectedValid = expectedJudgment === 'valid';
  const llmValid = judgment.valid;

  // --- Check 1: LLM judge matches expectedJudgment ---
  if (llmValid !== expectedValid) {
    const issuesSummary = judgment.issues
      .slice(0, 5)
      .map((i) => `  [msg ${i.messageIndex}, ${i.rule}] ${i.issue}`)
      .join('\n');
    return {
      pass: false,
      score: 0,
      reason: `LLM judge expected "${expectedJudgment}" but returned "${llmValid ? 'valid' : 'invalid'}".\nJudge's issues:\n${issuesSummary || '  (none)'}`,
    };
  }

  // --- Check 2: required rules surfaced (only for invalid cases) ---
  const expectedRules = Array.isArray(config.expectedRules) ? config.expectedRules : null;
  if (expectedRules && !expectedValid) {
    const seenRules = new Set(judgment.issues.map((i) => i.rule));
    const missing = expectedRules.filter((r) => !seenRules.has(r));
    if (missing.length > 0) {
      return {
        pass: false,
        score: 0.5,
        reason: `LLM judge correctly marked invalid but missed expected rule violation(s): ${missing.join(', ')}.\nSeen rules: ${[...seenRules].join(', ') || '(none)'}`,
      };
    }
  }

  // --- Check 3: cross-check against validateConversation (deterministic) ---
  // Activated when the test provides `vars.steps`. Runs the deterministic
  // validator on the assistant messages and asserts it agrees with both
  // the expected judgment AND the LLM's judgment.
  let crossCheckSummary = '';
  if (Array.isArray(vars.steps) && vars.steps.length > 0) {
    const assistantMessages = (Array.isArray(vars.conversation) ? vars.conversation : [])
      .filter((t) => t.role === 'assistant')
      .map((t) => t.content ?? '');

    const validatorResult = validateConversation(assistantMessages, {
      steps: vars.steps,
      exclude: ['thinking-block'],
    });
    const validatorOk = validatorResult.ok;

    if (validatorOk !== expectedValid) {
      const errs = validatorResult.issues
        .filter((i) => i.severity === 'error')
        .slice(0, 5)
        .map((i) => `  [msg ${i.messageIndex}] ${i.message}`)
        .join('\n');
      return {
        pass: false,
        score: 0,
        reason: `validateConversation disagrees with expected judgment.\nExpected: "${expectedJudgment}".\nDeterministic validator: "${validatorOk ? 'valid' : 'invalid'}".\nLLM judge: "${llmValid ? 'valid' : 'invalid'}".\nValidator errors:\n${errs || '  (none)'}`,
      };
    }

    // Both agree with expected → cross-check passed
    const errCount = validatorResult.issues.filter((i) => i.severity === 'error').length;
    crossCheckSummary = ` | validator: ${validatorOk ? 'ok' : `${errCount} error(s)`}`;
  }

  return {
    pass: true,
    score: 1,
    reason: expectedValid
      ? `Judge correctly marked the conversation as valid${crossCheckSummary}`
      : `Judge correctly marked the conversation as invalid (${judgment.issues.length} issue${judgment.issues.length === 1 ? '' : 's'})${crossCheckSummary}`,
  };
}
