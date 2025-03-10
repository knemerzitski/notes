import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { virtualRouteConfig } from './virtual-routes.config';
import child_process from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(child_process.exec);

// Project root directory
const envDir = '../../';

// https://vitejs.dev/config/
// eslint-disable-next-line import/no-default-export
export default async ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(process.env.NODE_ENV ?? mode, envDir) };

  function nodeEnvToBuildMode(nodeEnv: string | undefined) {
    switch (nodeEnv) {
      case 'production':
        return 'prod';
      case 'test':
        return 'test';
      default:
        return 'dev';
    }
  }
  process.env.VITE_BUILD_MODE = nodeEnvToBuildMode(process.env.NODE_ENV);
  process.env.VITE_BUILD_HASH =
    (await exec('git rev-parse --short HEAD')).stdout ?? '????';
  process.env.VITE_BUILD_HASH = process.env.VITE_BUILD_HASH.trim();

  return defineConfig({
    plugins: [
      react(),
      TanStackRouterVite({
        virtualRouteConfig,
        generatedRouteTree: 'src/__generated__/routeTree.gen.ts',
      }),
      /**
       * @see {@link https://vite-pwa-org.netlify.app/guide/}
       */
      VitePWA({
        disable: process.env.NODE_ENV !== 'production',
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
          enabled: false,
          resolveTempFolder: () => './out-dev-pwa',
        },
      }),
    ],
    build: {
      outDir: process.env.VITE_APP_OUT_DIR ?? 'out',
    },
    envDir,
    server: {
      port: process.env.VITE_APP_PORT ? Number(process.env.VITE_APP_PORT) : undefined,
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
