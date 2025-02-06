import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

import { virtualRouteConfig } from './virtual-routes.config';

// Project root directory
const envDir = '../../';

// https://vitejs.dev/config/
// eslint-disable-next-line import/no-default-export
export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, envDir) };

  return defineConfig({
    plugins: [
      react(),
      TanStackRouterVite({
        virtualRouteConfig,
        generatedRouteTree: 'src/__generated__/routeTree.gen.ts',
      }),
      tsconfigPaths(),
      /**
       * @see {@link https://vite-pwa-org.netlify.app/guide/}
       */
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        manifest: {
          name: 'Notes',
          short_name: 'Notes',
          description: 'Collaborative note taking app',
          start_url: '/',
          theme_color: '#92fde1',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          resolveTempFolder: () => './dev-out',
        },
      }),
      {
        name: 'warn-not-production',
        closeBundle: () => {
          if (process.env.NODE_ENV !== 'production') {
            console.log();
            console.error(
              '\x1b[31m ATTENTION DEVELOPER! This is not a production build. DO NOT deploy!!!!!!!\x1b[0m'
            );
            console.log();
          }
        },
      },
    ],
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
