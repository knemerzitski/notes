import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['!src/**/*.int.test.ts', 'src/**/*.test.ts'],
  },
});
