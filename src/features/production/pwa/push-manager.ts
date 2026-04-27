/**
 * Push Manager — Web Push notification subscription manager
 *
 * Handles requesting notification permission, subscribing to push
 * via VAPID keys, and syncing subscriptions with the server.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

/** Convert a base64 string to Uint8Array for the push manager */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export type PushPermissionState = 'default' | 'granted' | 'denied'

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Request notification permission from the user.
 * Returns the final permission state.
 */
export async function requestPushPermission(): Promise<PushPermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[PushManager] Notifications not supported')
    return 'denied'
  }

  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'

  const permission = await Notification.requestPermission()
  return permission as PushPermissionState
}

/**
 * Subscribe the user to push notifications.
 * Requires a service worker registration and VAPID public key.
 */
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('[PushManager] VAPID public key not configured')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const existingSubscription = await registration.pushManager.getSubscription()

    let subscription: PushSubscription

    if (existingSubscription) {
      subscription = existingSubscription
    } else {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      })
    }

    const subscriptionData: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.getKey('p256dh')
          ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!)))
          : '',
        auth: subscription.getKey('auth')
          ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
          : '',
      },
    }

    // Send subscription to server
    await sendSubscriptionToServer(subscriptionData)

    return subscriptionData
  } catch (error) {
    console.error('[PushManager] Subscription failed:', error)
    return null
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      // Notify server
      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
    }

    return true
  } catch (error) {
    console.error('[PushManager] Unsubscribe failed:', error)
    return false
  }
}

/**
 * Send push subscription data to the server for storage.
 */
async function sendSubscriptionToServer(subscription: PushSubscriptionData): Promise<void> {
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  })

  if (!response.ok) {
    throw new Error(`Failed to save push subscription: ${response.status}`)
  }
}

/**
 * Get the current push permission state without requesting.
 */
export function getPushPermissionState(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission as PushPermissionState
}

/**
 * Check if push notifications are supported and configured.
 */
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}
