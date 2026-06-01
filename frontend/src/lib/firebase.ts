import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined

/** True only when every required Firebase value + VAPID key is configured. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      VAPID_KEY,
  )
}

let app: FirebaseApp | null = null
let messaging: Messaging | null = null

/**
 * Lazily resolve the FCM Messaging instance. Returns null when Firebase is not
 * configured or the browser does not support web push (so callers can no-op).
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (!isFirebaseConfigured()) return null
  if (!(await isSupported().catch(() => false))) return null

  if (!app) app = initializeApp(firebaseConfig)
  if (!messaging) messaging = getMessaging(app)

  return messaging
}
