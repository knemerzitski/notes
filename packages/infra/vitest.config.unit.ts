import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [],
  envDir: '../../',
  test: {
    include: ['!lib/**/*.int.test.ts', '!__tests__', 'lib/**/*.test.ts'],
  },
});
