import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React Native docs page renders `@mobile-reality/mdma-renderer-react-native`
// live in the browser by aliasing `react-native` → `react-native-web`. Resolve
// RNW to an absolute path: the renderer's `import … from 'react-native'` fires
// from inside its own dist, where pnpm doesn't expose RNW.
const require = createRequire(import.meta.url);
const reactNativeWeb = require.resolve('react-native-web');

export default defineConfig({
  plugins: [react()],
  base: '/mdma/',
  define: {
    global: 'window',
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
  resolve: {
    alias: { 'react-native': reactNativeWeb },
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  },
  optimizeDeps: { include: ['react-native-web'] },
});
