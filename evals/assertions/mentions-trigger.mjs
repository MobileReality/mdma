/**
 * Asserts that the generated customPrompt includes trigger/when-to-generate
 * instructions matching the configured trigger mode.
 *
 * config.mode: 'keyword' | 'immediate' | 'contextual' | 'form-submit' | 'multi-step'
 * config.keywords: string[] — for keyword mode, specific phrases to check
 * config.contextHints: string[] — for contextual mode, hints to look for
 * config.steps: { mode: string, keywords?: string[] }[] — for multi-step mode
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

  if (mode === 'form-submit') {
    const markers = /submit|after.*form|previous step|form.*complet|upon.*submis/;
    if (markers.test(lower)) {
      return { pass: true, score: 1, reason: 'Found form-submit trigger instruction' };
    }
    return { pass: false, score: 0, reason: 'Missing form-submit trigger instruction' };
  }

  if (mode === 'multi-step') {
    // Check that output describes a multi-step / sequential flow
    const stepMarkers = /step\s*[12345]|phase\s*[12345]|first.*then|after.*submit|next.*step|sequential|in order/i;
    if (!stepMarkers.test(output)) {
      return { pass: false, score: 0, reason: 'Output does not describe a multi-step flow' };
    }

    // Optionally check per-step trigger modes
    const steps = config?.steps || [];
    if (steps.length === 0) {
      return { pass: true, score: 1, reason: 'Found multi-step flow language' };
    }

    let matched = 0;
    for (const step of steps) {
      if (step.mode === 'keyword' && step.keywords) {
        const found = step.keywords.some((kw) => lower.includes(kw.toLowerCase()));
        if (found) matched++;
      } else if (step.mode === 'immediate') {
        if (/immediate|first message|always|conversation start/.test(lower)) matched++;
      } else if (step.mode === 'form-submit') {
        if (/submit|after.*form|previous step/.test(lower)) matched++;
      } else if (step.mode === 'contextual' && step.keywords) {
        const found = step.keywords.some((kw) => lower.includes(kw.toLowerCase()));
        if (found) matched++;
      } else {
        matched++; // no specific check, count as passed
      }
    }

    const score = matched / steps.length;
    return {
      pass: score >= 0.5,
      score,
      reason: `Matched ${matched}/${steps.length} step triggers in multi-step flow`,
    };
  }

  return { pass: true, score: 1, reason: 'No trigger mode specified' };
}
