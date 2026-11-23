import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 127.0.0.1, not localhost: wrangler binds IPv4 and Node may resolve localhost to ::1.
const WORKER = 'http://127.0.0.1:8787';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': WORKER,
      '/auth': WORKER,
      '/ics': WORKER,
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
