import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.?(c|m)[jt]s?(x)'],
    environment: 'node',
    testTimeout: 30_000,
    passWithNoTests: true,
  },
});
