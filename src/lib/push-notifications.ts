'use client'

const PUSH_SUBSCRIPTION_KEY = 'push_subscription'
const PUSH_NOTIFICATIONS_KEY = 'push_notifications'

export interface PushNotification {
  id: string
  title: string
  body: string
  timestamp: number
  read: boolean
  taskId?: string
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    return false
  }

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const permission = await requestNotificationPermission()
    if (!permission) return null

    const registration = await navigator.serviceWorker.ready
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_KEY || '') as BufferSource
    })

    saveSubscription(subscription)
    return subscription
  } catch (error) {
    console.error('Failed to subscribe to push:', error)
    return null
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
      removeSubscription()
    }
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error)
  }
}

function saveSubscription(subscription: PushSubscription): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subscription))
  } catch (error) {
    console.error('Failed to save subscription:', error)
  }
}

function removeSubscription(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(PUSH_SUBSCRIPTION_KEY)
  } catch (error) {
    console.error('Failed to remove subscription:', error)
  }
}

export function getStoredNotifications(): PushNotification[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(PUSH_NOTIFICATIONS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveNotification(notification: Omit<PushNotification, 'id' | 'timestamp' | 'read'>): PushNotification {
  const notifications = getStoredNotifications()
  const newNotification: PushNotification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    read: false
  }
  
  notifications.unshift(newNotification)
  
  if (notifications.length > 50) {
    notifications.splice(50)
  }
  
  try {
    localStorage.setItem(PUSH_NOTIFICATIONS_KEY, JSON.stringify(notifications))
  } catch (error) {
    console.error('Failed to save notification:', error)
  }
  
  return newNotification
}

export function markNotificationAsRead(id: string): void {
  const notifications = getStoredNotifications()
  const index = notifications.findIndex(n => n.id === id)
  
  if (index !== -1) {
    notifications[index].read = true
    try {
      localStorage.setItem(PUSH_NOTIFICATIONS_KEY, JSON.stringify(notifications))
    } catch (error) {
      console.error('Failed to update notification:', error)
    }
  }
}

export function markAllNotificationsAsRead(): void {
  const notifications = getStoredNotifications()
  notifications.forEach(n => n.read = true)
  
  try {
    localStorage.setItem(PUSH_NOTIFICATIONS_KEY, JSON.stringify(notifications))
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
  }
}

export function deleteNotification(id: string): void {
  const notifications = getStoredNotifications()
  const filtered = notifications.filter(n => n.id !== id)
  
  try {
    localStorage.setItem(PUSH_NOTIFICATIONS_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to delete notification:', error)
  }
}

export function bulkDeleteNotifications(ids: string[]): void {
  const notifications = getStoredNotifications()
  const filtered = notifications.filter(n => !ids.includes(n.id))
  
  try {
    localStorage.setItem(PUSH_NOTIFICATIONS_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to bulk delete notifications:', error)
  }
}

export function clearAllNotifications(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PUSH_NOTIFICATIONS_KEY, JSON.stringify([]))
  } catch (error) {
    console.error('Failed to clear notifications:', error)
  }
}

export function getUnreadCount(): number {
  const notifications = getStoredNotifications()
  return notifications.filter(n => !n.read).length
}

export function showBrowserNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === 'undefined') return
  
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options
    })
  }
}

export function scheduleTaskReminder(taskTitle: string, taskId: string, delayMinutes: number): void {
  if (typeof window === 'undefined') return
  
  const timeoutId = setTimeout(() => {
    showBrowserNotification('Task Reminder', {
      body: `Time to work on: ${taskTitle}`,
      tag: `task-${taskId}`
    })
    
    saveNotification({
      title: 'Task Reminder',
      body: taskTitle,
      taskId
    })
  }, delayMinutes * 60 * 1000)

  sessionStorage.setItem(`reminder_${taskId}`, String(timeoutId))
}

export function cancelTaskReminder(taskId: string): void {
  if (typeof window === 'undefined') return
  
  const timeoutId = sessionStorage.getItem(`reminder_${taskId}`)
  if (timeoutId) {
    clearTimeout(Number(timeoutId))
    sessionStorage.removeItem(`reminder_${taskId}`)
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export const pushService = {
  requestPermission: requestNotificationPermission,
  subscribe: subscribeToPush,
  unsubscribe: unsubscribeFromPush,
  showNotification: showBrowserNotification,
  scheduleReminder: scheduleTaskReminder,
  cancelReminder: cancelTaskReminder,
  getNotifications: getStoredNotifications,
  saveNotification,
  markAsRead: markNotificationAsRead,
  markAllAsRead: markAllNotificationsAsRead,
  deleteNotification,
  bulkDelete: bulkDeleteNotifications,
  clearAll: clearAllNotifications,
  getUnreadCount
}

export default pushService