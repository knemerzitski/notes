import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // @ts-expect-error Type conflict between 'vitest/config' and 'vite-tsconfig-paths' but tsconfig paths are imported correctly
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
