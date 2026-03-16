import { PROVIDER_PRESETS } from './llm-client.js';

const STORAGE_KEY = 'mdma-builder-api-keys';

export function loadApiKeys(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveApiKey(provider: string, key: string) {
  const keys = loadApiKeys();
  keys[provider] = key;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function detectProvider(baseUrl: string): string | null {
  for (const [name, preset] of Object.entries(PROVIDER_PRESETS)) {
    if (baseUrl === preset.baseUrl) return name;
  }
  return null;
}
