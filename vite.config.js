import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // three.js is most of the bundle; it is one cacheable file by design
    chunkSizeWarningLimit: 800,
  },
});
