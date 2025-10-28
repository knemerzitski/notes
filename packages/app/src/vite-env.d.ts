/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_HTTP_URL: string;
  readonly VITE_GRAPHQL_WS_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_MOCK_GOOGLE_AUTH: string;
  readonly VITE_DEV_TOOLS: string;
  readonly VITE_BUILD_HASH: string;
  readonly VITE_BUILD_MODE: string;
  readonly VITE_DEMO_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
