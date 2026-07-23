import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Plain browser Vue app — the renderer-vue package needs no aliasing.
export default defineConfig({
  plugins: [vue()],
});
