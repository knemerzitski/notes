import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'out',
  },
  envDir: '../../',
  server: {
    proxy: {
      '/graphql': 'http://192.168.1.80:4000/graphql',
    },
    // https://vitejs.dev/config/server-options.html
    // TODO proxy ws?
  },
});
