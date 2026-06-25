/**
 * Asserts that the output contains a webhook component with required fields.
 */
export default function (output) {
  const hasWebhook = output.includes('type: webhook');
  const hasUrl = output.includes('url:');
  const hasTrigger = output.includes('trigger:');

  if (hasWebhook && hasUrl && hasTrigger) {
    return { pass: true, score: 1, reason: 'Webhook with url and trigger found' };
  }

  if (!hasWebhook) {
    return { pass: false, score: 0, reason: 'No webhook component found' };
  }
  const missing = [!hasUrl && 'url', !hasTrigger && 'trigger'].filter(Boolean);
  return { pass: false, score: 0.5, reason: `Webhook missing: ${missing.join(', ')}` };
}
