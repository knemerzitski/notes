/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_HTTP_URL: string;
  readonly VITE_GRAPHQL_WS_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_MOCK_GOOGLE_AUTH: string;
  readonly VITE_DEV_TOOLS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
