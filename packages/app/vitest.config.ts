import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  // @ts-expect-error Type conflict between 'vitest/config' and '@vitejs/plugin-react-swc'
  plugins: [react(), tsconfigPaths()],
  envDir: '../../',
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/helpers/setup.ts'],
    environment: 'jsdom',
  },
});
