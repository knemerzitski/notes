import { defineConfig } from 'vitest/config';

export default defineConfig({
  envDir: '../../',
  test: {
    include: ['src/**/*.test.ts'],
  },
});
