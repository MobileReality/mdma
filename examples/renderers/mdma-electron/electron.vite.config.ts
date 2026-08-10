import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

const shared = { alias: { '@shared': resolve(__dirname, 'src/shared') } };

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: shared,
    build: { rollupOptions: { input: resolve(__dirname, 'src/main/index.ts') } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: shared,
    build: { rollupOptions: { input: resolve(__dirname, 'src/preload/index.ts') } },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    resolve: shared,
    build: { rollupOptions: { input: resolve(__dirname, 'src/renderer/index.html') } },
  },
});
