type RuntimeConfig = {
  REACT_APP_API_BASE_URL?: string;
  REACT_APP_CLIENT_ID?: string;
  REACT_APP_CLIENT_SECRET?: string;
  REACT_APP_SECRET_KEY?: string;
  REACT_APP_ENABLE_AI?: string;
};

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

const fromRuntime = window.__APP_CONFIG__ || {};

export const runtimeConfig = {
  apiBaseUrl:
    fromRuntime.REACT_APP_API_BASE_URL || import.meta.env.REACT_APP_API_BASE_URL || "",
  clientId:
    fromRuntime.REACT_APP_CLIENT_ID || import.meta.env.REACT_APP_CLIENT_ID || "",
  clientSecret:
    fromRuntime.REACT_APP_CLIENT_SECRET || import.meta.env.REACT_APP_CLIENT_SECRET || "",
  secretKey:
    fromRuntime.REACT_APP_SECRET_KEY || import.meta.env.REACT_APP_SECRET_KEY || "default-secret-key",
  enableAI:
    (fromRuntime.REACT_APP_ENABLE_AI || import.meta.env.REACT_APP_ENABLE_AI || "false").toLowerCase() === "true",
};

