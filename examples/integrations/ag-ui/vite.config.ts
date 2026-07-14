import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Plain DOM React app — the AG-UI adapter + renderer-react need no RN aliasing.
export default defineConfig({
  plugins: [react()],
});
