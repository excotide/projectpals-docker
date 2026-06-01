import { getToken, deleteToken, onMessage } from 'firebase/messaging'
import { apiPost, apiDelete } from './api'
import { firebaseConfig, getMessagingInstance, isFirebaseConfigured, VAPID_KEY } from './firebase'

let foregroundBound = false

/** Register the firebase-messaging service worker, passing config via query params. */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey ?? '',
    authDomain: firebaseConfig.authDomain ?? '',
    projectId: firebaseConfig.projectId ?? '',
    messagingSenderId: firebaseConfig.messagingSenderId ?? '',
    appId: firebaseConfig.appId ?? '',
  })

  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`)
}

/**
 * Ask for notification permission, obtain the FCM token, and register it with
 * the backend. Safe to call repeatedly (e.g. on every app load while logged in).
 * No-ops when Firebase isn't configured, the browser lacks support, or the user
 * denied permission.
 */
export async function registerFcmToken(): Promise<void> {
  try {
    if (!isFirebaseConfigured()) return

    const messaging = await getMessagingInstance()
    if (!messaging) return

    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const swRegistration = await registerServiceWorker()
    if (!swRegistration) return

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    })
    if (!token) return

    await apiPost('/fcm/token', { token, platform: 'web' })

    bindForegroundHandler()
  } catch (err) {
    // Never let push setup break the app.
    console.warn('FCM token registration skipped:', err)
  }
}

/** Remove the current device token from the backend and Firebase (on logout). */
export async function unregisterFcmToken(): Promise<void> {
  try {
    const messaging = await getMessagingInstance()
    if (!messaging) return

    const token = await getToken(messaging, { vapidKey: VAPID_KEY }).catch(() => null)
    if (token) {
      await apiDelete('/fcm/token', { body: { token } }).catch(() => undefined)
    }
    await deleteToken(messaging).catch(() => undefined)
  } catch (err) {
    console.warn('FCM token removal skipped:', err)
  }
}

/** Show a notification while the tab is focused (foreground messages). */
function bindForegroundHandler(): void {
  if (foregroundBound) return
  foregroundBound = true

  void getMessagingInstance().then((messaging) => {
    if (!messaging) return
    onMessage(messaging, (payload) => {
      const n = payload.notification
      const title = n?.title ?? payload.data?.title ?? 'ProjectPals'
      const body = n?.body ?? payload.data?.body ?? ''

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.svg' })
      }
    })
  })
}
