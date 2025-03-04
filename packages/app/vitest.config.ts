import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vitest/config';

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  plugins: [react()],
  envDir: '../../',
  test: {
    coverage: {
      provider: 'v8',
    },
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/__tests__/helpers/setup.ts'],
    environment: 'jsdom',
  },
});
