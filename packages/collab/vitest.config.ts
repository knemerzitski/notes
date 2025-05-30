import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [],
  test: {
    coverage: {
      provider: 'v8',
    },
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/__tests__/helpers/setup.ts'],
  },
});
