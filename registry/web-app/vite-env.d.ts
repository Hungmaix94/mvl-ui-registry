/// <reference types="vite/client" />

interface ImportMetaEnvironment {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DASHBOARD_API_REFRESH_DURATION?: string
  readonly VITE_CHAT_WS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnvironment
}

interface Window {
  clarity?: (method: string, ...args: string[]) => void
}
