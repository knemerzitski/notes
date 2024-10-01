import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// Project root directory
const envDir = '../../';

// https://vitejs.dev/config/
// eslint-disable-next-line import/no-default-export
export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, envDir) };

  return defineConfig({
    plugins: [react(), tsconfigPaths()],
    build: {
      outDir: 'out',
    },
    envDir,
    server: {
      proxy: {
        '/graphql': {
          target: process.env.VITE_GRAPHQL_HTTP_URL,
          ignorePath: true,
        },
        '/graphql-ws': {
          target: process.env.VITE_GRAPHQL_WS_URL,
          ignorePath: true,
          ws: true,
        },
      },
    },
  });
};
