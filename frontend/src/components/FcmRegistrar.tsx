import { useEffect } from 'react'
import { registerFcmToken } from '../lib/fcm'

/**
 * Registers the device's FCM token with the backend whenever the user is
 * authenticated. Renders nothing. No-ops when Firebase isn't configured.
 */
export default function FcmRegistrar() {
  useEffect(() => {
    if (!localStorage.getItem('token')) return
    void registerFcmToken()
  }, [])

  return null
}
