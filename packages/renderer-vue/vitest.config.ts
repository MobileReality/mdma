import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Mount-level tests render real DOM, unlike the React package's pure-logic tests.
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
});
