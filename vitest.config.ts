import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src'), 'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js') } },
  test: {
    environment: 'node',
    include: ['tests/*.test.ts'],
    exclude: process.env.NOWBUILD_WRITE_EVAL_RESULTS === '1' ? ['tests/e2e/**'] : ['tests/e2e/**', 'tests/evals.test.ts'],
    coverage: { reporter: ['text', 'json-summary'] },
  },
});
