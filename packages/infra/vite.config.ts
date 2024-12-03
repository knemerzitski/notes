import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
// eslint-disable-next-line import/no-default-export
export default () => {
  return defineConfig({
    plugins: [tsconfigPaths()],
  });
};
