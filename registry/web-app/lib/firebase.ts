// Import the functions you need from the SDKs you need
import { getAnalytics } from 'firebase/analytics'
import { initializeApp } from 'firebase/app'
import { getMessaging, getToken } from 'firebase/messaging'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const isFirebaseConfigured = !!firebaseConfig.apiKey

// Initialize Firebase
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null

let analytics: ReturnType<typeof getAnalytics> | null = null
let messaging: ReturnType<typeof getMessaging> | null = null

if (isFirebaseConfigured && app && typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app)
  } catch (error) {
    console.warn('Firebase Analytics not supported in this environment')
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      messaging = getMessaging(app)
    } catch (error) {
      console.warn('Firebase Messaging not supported in this environment')
    }
  }
}

const getFCMToken = async () => {
  if (!messaging) {
    console.warn('Firebase is not configured. Skipping FCM token retrieval.')
    return null
  }

  try {
    const fetchTokenPromise = async () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'denied') {
          console.warn('Notification permission is denied. Skipping FCM token retrieval.')
          return null
        }

        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission()
          if (permission !== 'granted') {
            console.warn('Notification permission was not granted.')
            return null
          }
        }
      } else {
        console.warn('This browser does not support desktop notification')
        return null
      }

      if (!messaging) return null
      return getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
    }

    // Add a 5-second timeout to prevent blocking login indefinitely (including waiting for user prompt)
    const token = await Promise.race([
      fetchTokenPromise(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('FCM token request timed out')), 10000)
      ),
    ])

    console.log('FCM Token:', token)
    return token
  } catch (error) {
    console.warn('FCM token could not be retrieved (permission blocked or unavailable).', error)
    return null
  }
}

export { analytics, app, getFCMToken, messaging }
