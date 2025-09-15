import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts'
    ],
    exclude: [
      'node_modules/**',
      'tests/e2e/**',
      'src/**/__tests__/**'
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  },
});


