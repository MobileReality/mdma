const EXTERNAL_PROTOCOLS = ['https:', 'http:'] as const;

function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

export function isAllowedExternalUrl(url: string): boolean {
  const parsed = parseUrl(url);
  return parsed !== undefined && (EXTERNAL_PROTOCOLS as readonly string[]).includes(parsed.protocol);
}

export function createAppUrlGuard(appUrl: string): (url: string) => boolean {
  const app = new URL(appUrl);

  if (app.protocol === 'file:') {
    return (url) => {
      const candidate = parseUrl(url);
      return (
        candidate?.protocol === 'file:' &&
        candidate.host === app.host &&
        candidate.pathname === app.pathname
      );
    };
  }

  return (url) => parseUrl(url)?.origin === app.origin;
}
