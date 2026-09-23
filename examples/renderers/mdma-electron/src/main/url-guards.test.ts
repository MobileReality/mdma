import { describe, expect, it } from 'vitest';
import { createAppUrlGuard, isAllowedExternalUrl } from './url-guards.js';

describe('isAllowedExternalUrl', () => {
  it.each(['https://example.com/docs', 'http://example.com'])('accepts %s', (url) => {
    expect(isAllowedExternalUrl(url)).toBe(true);
  });

  it.each([
    'file:///etc/passwd',
    'javascript:alert(1)',
    'smb://attacker/share',
    'ms-settings:',
    'data:text/html,<script>alert(1)</script>',
    'not a url',
    '',
  ])('rejects %s', (url) => {
    expect(isAllowedExternalUrl(url)).toBe(false);
  });
});

describe('createAppUrlGuard', () => {
  describe('dev server', () => {
    const isAppUrl = createAppUrlGuard('http://localhost:5173/');

    it('accepts pages on the dev-server origin', () => {
      expect(isAppUrl('http://localhost:5173/')).toBe(true);
      expect(isAppUrl('http://localhost:5173/index.html#x')).toBe(true);
    });

    it('rejects other origins', () => {
      expect(isAppUrl('http://localhost:5174/')).toBe(false);
      expect(isAppUrl('https://localhost:5173/')).toBe(false);
      expect(isAppUrl('https://evil.example/')).toBe(false);
      expect(isAppUrl('file:///app/out/renderer/index.html')).toBe(false);
      expect(isAppUrl('garbage')).toBe(false);
    });
  });

  describe('packaged file page', () => {
    const isAppUrl = createAppUrlGuard('file:///app/out/renderer/index.html');

    it('accepts the app page itself', () => {
      expect(isAppUrl('file:///app/out/renderer/index.html')).toBe(true);
      expect(isAppUrl('file:///app/out/renderer/index.html#section')).toBe(true);
    });

    it('rejects any other file or origin', () => {
      expect(isAppUrl('file:///etc/passwd')).toBe(false);
      expect(isAppUrl('file:///app/out/renderer/other.html')).toBe(false);
      expect(isAppUrl('file://remote-host/app/out/renderer/index.html')).toBe(false);
      expect(isAppUrl('https://evil.example/')).toBe(false);
    });
  });
});
