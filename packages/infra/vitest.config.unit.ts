import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [tsconfigPaths()],
  envDir: '../../',
  envPrefix: 'TEST_',
  test: {
    include: ['!lib/**/*.int.test.ts', '!__tests__', 'lib/**/*.test.ts'],
  },
});
