import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  // @ts-expect-error Type conflict between 'vitest/config' and 'vite-tsconfig-paths' but tsconfig paths are imported correctly
  plugins: [tsconfigPaths()],
  envDir: '../../',
  test: {
    env: {
      NODE_ENV: 'production',
    },
    include: ['!src/**/*.int.test.ts', '!src/__tests__', 'src/**/*.test.ts'],
    setupFiles: ['src/__tests__/helpers/setup.unit.ts'],
  },
});
