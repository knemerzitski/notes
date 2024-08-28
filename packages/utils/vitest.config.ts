/* eslint-disable import/no-default-export */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  envDir: '../../',
  envPrefix: 'TEST_',
  test: {
    include: ['src/**/*.test.ts'],
  },
});
