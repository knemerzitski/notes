import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [],
  envDir: '../../',
  test: {
    env: {
      NODE_ENV: 'production',
    },
    include: ['!src/**/*.int.test.ts', '!src/__tests__', 'src/**/*.test.ts'],
    setupFiles: ['src/__tests__/helpers/setup.unit.ts'],
  },
});
