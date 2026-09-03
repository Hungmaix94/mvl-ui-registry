import { QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Theme } from '@radix-ui/themes'

import App from './App'

import { queryClient } from '@/api/react-query-client'
import './assets/styles/map.css'
import './assets/styles/index.css'
import './assets/styles/animations.css'
import { clarity } from 'react-microsoft-clarity'
import * as Sentry from '@sentry/react'

const PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || ''
const CLARITY_ENABLED = import.meta.env.VITE_CLARITY_ENABLED !== 'false'

if (PROJECT_ID && CLARITY_ENABLED) {
  clarity.init(PROJECT_ID)
}

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const SENTRY_ENABLED = import.meta.env.VITE_SENTRY_ENABLED === 'true'
const APP_ENV = import.meta.env.MODE // development | staging | production

if (SENTRY_DSN && SENTRY_ENABLED) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
    enabled: SENTRY_ENABLED,

    // Privacy: tắt gửi PII mặc định trừ khi cần
    sendDefaultPii: false,

    // Chỉ gửi khi match domain production/staging
    allowUrls: [/erp\.maivietland\.vn/],

    // Bỏ qua một số lỗi phổ biến
    ignoreErrors: ['ResizeObserver loop', 'Non-Error promise rejection', 'Loading chunk'],

    beforeSend(event) {
      if (event.user?.ip_address) {
        delete event.user.ip_address
      }
      return event
    },
  })
}

ReactDOM.createRoot(document.querySelector('#root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Theme>
        <App />
      </Theme>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  </React.StrictMode>
)

if ('serviceWorker' in navigator) {
  const firebaseConfig = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  })

  navigator.serviceWorker
    .register(`/firebase-messaging-sw.js?${firebaseConfig.toString()}`)
    .then((registration) => {
      console.log('Registration successful, scope is:', registration.scope)
    })
    .catch((err) => {
      console.log('Service worker registration failed, error:', err)
    })
}
