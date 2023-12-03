import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';

const envDir = '../../';

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, envDir) };

  return defineConfig({
    plugins: [react()],
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
