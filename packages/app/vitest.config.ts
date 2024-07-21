import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // @ts-expect-error Type conflict between 'vitest/config' and '@vitejs/plugin-react-swc'
  plugins: [react(), tsconfigPaths()],
  envDir: '../../',
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/__test__/helpers/setup.ts'],
    environment: 'jsdom',
  },
});
