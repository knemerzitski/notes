import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['!src/**/*.int.test.ts', 'src/**/*.test.ts'],
    setupFiles: ['src/__tests__/helpers/setup.ts'],
  },
});
