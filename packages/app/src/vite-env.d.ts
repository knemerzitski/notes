/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_HTTP_URL: string;
  readonly VITE_GRAPHQL_WS_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_MOCK_GOOGLE_AUTH: string;
  readonly VITE_WARNING_BUILD_PRODUCTION_ONLY_FOR_LOCALHOST: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
