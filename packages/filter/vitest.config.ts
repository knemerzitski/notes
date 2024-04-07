import { defineConfig } from 'vitest/config';

export default defineConfig({
  envDir: '../../',
  test: {
    env: {
      NODE_ENV: 'production',
    },
    include: ['src/**/*.test.ts'],
  },
});
