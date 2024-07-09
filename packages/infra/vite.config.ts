import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default () => {
  return defineConfig({
    plugins: [tsconfigPaths()],
  });
};
