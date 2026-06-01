/* global importScripts, firebase */
// FCM background handler. Runs even when the tab/browser is closed.
// Firebase config is passed as query params at registration time (see lib/fcm.ts),
// so values stay in .env rather than being duplicated here.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

const params = new URL(self.location).searchParams

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
})

const messaging = firebase.messaging()

// Messages that carry a `notification` block are displayed automatically by the
// SDK. Only render manually for data-only messages to avoid duplicate banners.
messaging.onBackgroundMessage((payload) => {
  if (payload.notification) return

  const data = payload.data || {}
  self.registration.showNotification(data.title || 'ProjectPals', {
    body: data.body || '',
    icon: '/favicon.svg',
    data,
  })
})

// Focus/open the app when a notification is clicked.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/')
    }),
  )
})
