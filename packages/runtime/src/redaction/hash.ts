/** Simple hash for redacting sensitive values (non-cryptographic, for logging only) */
export function hashValue(value: unknown): string {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `redacted:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
