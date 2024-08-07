import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default () => {
  return defineConfig({
    // @ts-expect-error Ignore typing mismatch, still works
    plugins: [tsconfigPaths()],
  });
};
