/**
 * Asserts that the model called the `generate_mdma` tool.
 *
 * Checks the output and raw response in all known locations promptfoo may
 * place tool-call data, so this works regardless of the provider or how
 * promptfoo serialises the tool call response.
 *
 * Optional config:
 *   - shouldCall: boolean (default true) — set to false to assert that the
 *     model did NOT call the tool (e.g. for conversational / info requests).
 */
export default function (output, context) {
  try {
    const shouldCall = context?.config?.shouldCall ?? true;

    const parts = [
      output,
      context?.response,
      context?.response?.output,
      context?.response?.raw,
    ].map((v) => {
      if (v == null) return '';
      if (typeof v === 'string') return v;
      try { return JSON.stringify(v); } catch { return ''; }
    });

    const combined = parts.join('\n');
    const called = combined.includes('generate_mdma');

    if (shouldCall) {
      return {
        pass: called,
        score: called ? 1 : 0,
        reason: called
          ? 'Model correctly called generate_mdma tool'
          : 'Model did not call generate_mdma — check tool definition and system prompt tool-use instruction',
      };
    }

    return {
      pass: !called,
      score: !called ? 1 : 0,
      reason: !called
        ? 'Model correctly did not call generate_mdma for a non-document request'
        : 'Model should not have called generate_mdma for this request',
    };
  } catch (err) {
    return {
      pass: false,
      score: 0,
      reason: `Assertion error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
