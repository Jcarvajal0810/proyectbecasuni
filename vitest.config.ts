import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup-env.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // El núcleo puro y la frontera de fetch son la garantía del producto:
      // su cobertura es un criterio de aceptación, no un dato decorativo.
      include: ['src/core/**', 'src/fetch/**', 'src/jobs/auth.ts'],
      thresholds: {
        lines: 90,
        statements: 90,
        branches: 85,
        functions: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});