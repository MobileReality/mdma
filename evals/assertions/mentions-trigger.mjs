/**
 * Asserts that the generated customPrompt includes trigger/when-to-generate
 * instructions matching the configured trigger mode.
 *
 * config.mode: 'keyword' | 'immediate' | 'contextual'
 * config.keywords: string[] — for keyword mode, specific phrases to check
 * config.contextHints: string[] — for contextual mode, hints to look for
 */
export default function (output, { config }) {
  const mode = config?.mode;
  const lower = output.toLowerCase();

  if (mode === 'keyword') {
    const keywords = config?.keywords || [];
    if (keywords.length === 0) {
      return { pass: true, score: 1, reason: 'No keywords to check' };
    }
    const found = keywords.filter((kw) => lower.includes(kw.toLowerCase()));
    if (found.length > 0) {
      return {
        pass: true,
        score: found.length / keywords.length,
        reason: `Found ${found.length}/${keywords.length} trigger keywords: ${found.join(', ')}`,
      };
    }
    return {
      pass: false,
      score: 0,
      reason: `None of the trigger keywords found: ${keywords.join(', ')}`,
    };
  }

  if (mode === 'immediate') {
    const markers = /immediate|first message|always|conversation start|right away/;
    if (markers.test(lower)) {
      return { pass: true, score: 1, reason: 'Found immediate trigger instruction' };
    }
    return { pass: false, score: 0, reason: 'Missing immediate trigger instruction' };
  }

  if (mode === 'contextual') {
    const hints = config?.contextHints || [];
    if (hints.length === 0) {
      // At least check for contextual-sounding language
      const contextMarkers = /when.*user|after.*attempt|if.*express|condition|context/;
      if (contextMarkers.test(lower)) {
        return { pass: true, score: 1, reason: 'Found contextual trigger language' };
      }
      return { pass: false, score: 0, reason: 'Missing contextual trigger language' };
    }
    const found = hints.filter((h) => lower.includes(h.toLowerCase()));
    if (found.length > 0) {
      return {
        pass: true,
        score: found.length / hints.length,
        reason: `Found ${found.length}/${hints.length} context hints`,
      };
    }
    return {
      pass: false,
      score: 0,
      reason: `None of the contextual hints found: ${hints.join(', ')}`,
    };
  }

  return { pass: true, score: 1, reason: 'No trigger mode specified' };
}
