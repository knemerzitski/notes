import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // @ts-expect-error
  plugins: [tsconfigPaths()],
  envDir: '../../',
  test: {
    env: {
      NODE_ENV: 'production',
    },
    include: ['!src/**/*.int.test.ts', '!src/tests', 'src/**/*.test.ts'],
    setupFiles: ['src/tests/helpers/setup.unit.ts'],
  },
});
