/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_ENV: string;
  readonly REACT_APP_API_BASE_URL: string;
  readonly REACT_APP_CLIENT_ID: string;
  readonly REACT_APP_CLIENT_SECRET: string;
  readonly REACT_APP_SECRET_KEY: string;
  readonly REACT_APP_ENABLE_AI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
