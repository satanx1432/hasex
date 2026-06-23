import { DatabaseService } from '../supabase/database'

export interface Notification {
  id: string
  user_id: string
  type: 'task_reminder' | 'goal_milestone' | 'achievement_unlocked' | 'streak_alert' | 'cognitive_alert' | 'social' | 'system'
  title: string
  message: string
  data?: any
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  read: boolean
  read_at?: string
  action_url?: string
  action_label?: string
  expires_at?: string
  delivery_channels: ('in_app' | 'push' | 'email' | 'sms')[]
  delivery_status: Record<string, 'pending' | 'sent' | 'delivered' | 'failed'>
}

export interface NotificationPreferences {
  user_id: string
  enable_notifications: boolean
  quiet_hours: {
    enabled: boolean
    start: string
    end: string
  }
  channels: {
    in_app: boolean
    push: boolean
    email: boolean
    sms: boolean
  }
  categories: {
    task_reminders: boolean
    goal_milestones: boolean
    achievements: boolean
    streak_alerts: boolean
    cognitive_alerts: boolean
    social: boolean
    system: boolean
  }
  frequency: {
    immediate: boolean
    daily_digest: boolean
    weekly_summary: boolean
  }
}

export interface NotificationTemplate {
  id: string
  type: Notification['type']
  title_template: string
  message_template: string
  default_priority: Notification['priority']
  default_channels: Notification['delivery_channels']
  data_schema: any
}

export class NotificationSystem {
  private db: DatabaseService
  private templates: NotificationTemplate[] = [
    {
      id: 'task_reminder',
      type: 'task_reminder',
      title_template: 'Time to complete: {{task_title}}',
      message_template: 'You have a pending task: {{task_title}}. Estimated time: {{estimated_time}} min.',
      default_priority: 'medium',
      default_channels: ['in_app', 'push'],
      data_schema: {
        task_id: 'string',
        task_title: 'string',
        estimated_time: 'number',
        scheduled_time: 'string',
      },
    },
    {
      id: 'goal_milestone',
      type: 'goal_milestone',
      title_template: 'Milestone reached for {{goal_title}}!',
      message_template: 'Congratulations! You have reached {{progress}}% progress on {{goal_title}}.',
      default_priority: 'high',
      default_channels: ['in_app', 'push', 'email'],
      data_schema: {
        goal_id: 'string',
        goal_title: 'string',
        progress: 'number',
        milestone_type: 'string',
      },
    },
    {
      id: 'achievement_unlocked',
      type: 'achievement_unlocked',
      title_template: 'Achievement Unlocked: {{achievement_title}}',
      message_template: 'You have earned the "{{achievement_title}}" achievement! {{achievement_description}}',
      default_priority: 'high',
      default_channels: ['in_app', 'push'],
      data_schema: {
        achievement_id: 'string',
        achievement_title: 'string',
        achievement_description: 'string',
        points: 'number',
      },
    },
    {
      id: 'streak_alert',
      type: 'streak_alert',
      title_template: '{{streak_length}} day streak!',
      message_template: "You're on fire! Keep the momentum going to maintain your {{streak_length}} day streak.",
      default_priority: 'medium',
      default_channels: ['in_app', 'push'],
      data_schema: {
        streak_length: 'number',
        milestone_reached: 'boolean',
      },
    },
    {
      id: 'cognitive_alert',
      type: 'cognitive_alert',
      title_template: 'Cognitive Load Alert',
      message_template: 'Your cognitive load assessment indicates {{status}}. {{recommendation}}',
      default_priority: 'high',
      default_channels: ['in_app', 'push'],
      data_schema: {
        status: 'string',
        score: 'number',
        recommendation: 'string',
        break_duration: 'number',
      },
    },
    {
      id: 'social',
      type: 'social',
      title_template: '{{friend_name}} {{action_type}}',
      message_template: '{{friend_name}} {{action_description}}',
      default_priority: 'low',
      default_channels: ['in_app'],
      data_schema: {
        friend_id: 'string',
        friend_name: 'string',
        action_type: 'string',
        action_description: 'string',
      },
    },
    {
      id: 'system',
      type: 'system',
      title_template: '{{system_title}}',
      message_template: '{{system_message}}',
      default_priority: 'medium',
      default_channels: ['in_app'],
      data_schema: {
        system_title: 'string',
        system_message: 'string',
        action_required: 'boolean',
      },
    },
  ]

  constructor() {
    this.db = new DatabaseService()
  }

  async createNotification(
    userId: string,
    type: Notification['type'],
    data: any,
    options?: Partial<Omit<Notification, 'id' | 'user_id' | 'type' | 'created_at' | 'delivery_status'>>
  ): Promise<Notification> {
    const template = this.templates.find(t => t.type === type)
    if (!template) {
      throw new Error(`No template found for notification type: ${type}`)
    }

    const title = this.renderTemplate(template.title_template, data)
    const message = this.renderTemplate(template.message_template, data)

    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      type,
      title,
      message,
      data,
      priority: options?.priority || template.default_priority,
      created_at: new Date().toISOString(),
      read: false,
      action_url: options?.action_url,
      action_label: options?.action_label,
      expires_at: options?.expires_at,
      delivery_channels: options?.delivery_channels || template.default_channels,
      delivery_status: template.default_channels.reduce((acc, channel) => {
        acc[channel] = 'pending'
        return acc
      }, {} as Record<string, 'pending' | 'sent' | 'delivered' | 'failed'>),
    }

    // Queue for delivery
    await this.queueNotificationDelivery(notification)

    // Save to database
    await this.db.createNotification({
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      priority: notification.priority,
      read: notification.read,
      read_at: notification.read_at,
      action_url: notification.action_url,
      action_label: notification.action_label,
      expires_at: notification.expires_at,
      delivery_channels: notification.delivery_channels,
      delivery_status: notification.delivery_status,
    })

    return notification
  }

  private renderTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match
    })
  }

  private async queueNotificationDelivery(notification: Notification): Promise<void> {
    // In production, this would queue in a message broker like Redis or SQS
    console.log('Queuing notification for delivery:', notification.id)

    // Simulate immediate delivery for in-app
    await this.deliverNotification(notification, 'in_app')

    // Schedule other channels based on preferences
    const preferences = await this.getUserPreferences(notification.user_id)
    if (preferences.channels.push && notification.delivery_channels.includes('push')) {
      await this.deliverNotification(notification, 'push')
    }
    if (preferences.channels.email && notification.delivery_channels.includes('email')) {
      await this.deliverNotification(notification, 'email')
    }
  }

  private async deliverNotification(
    notification: Notification,
    channel: 'in_app' | 'push' | 'email' | 'sms'
  ): Promise<void> {
    try {
      // Check quiet hours
      const preferences = await this.getUserPreferences(notification.user_id)
      if (this.isQuietHours(preferences) && channel !== 'in_app') {
        console.log(`Skipping ${channel} delivery during quiet hours`)
        notification.delivery_status[channel] = 'pending'
        return
      }

      if (channel === 'push') {
        await this.deliverPushNotification(notification)
      } else if (channel === 'email') {
        await this.deliverEmailNotification(notification)
      } else if (channel === 'sms') {
        await this.deliverSMSNotification(notification)
      } else {
        // In-app delivery is handled by the UI component
        notification.delivery_status[channel] = 'delivered'
      }

      console.log(`Notification ${notification.id} delivered via ${channel}`)
    } catch (error) {
      console.error(`Failed to deliver notification via ${channel}:`, error)
      notification.delivery_status[channel] = 'failed'
    }
  }

  private async deliverPushNotification(notification: Notification): Promise<void> {
    // Check for Service Worker and Push API support
    if (typeof window !== 'undefined' && (!('serviceWorker' in navigator) || !('PushManager' in window))) {
      console.log('Push notifications not supported in this environment')
      notification.delivery_status['push'] = 'failed'
      return
    }

    try {
      // In production, this would:
      // 1. Get the push subscription for the user
      // 2. Send the notification via web push protocol
      // 3. Handle the service worker registration

      // For now, simulate successful delivery
      await new Promise(resolve => setTimeout(resolve, 100))
      notification.delivery_status['push'] = 'delivered'

      // Trigger local notification if supported
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          tag: notification.id,
          data: notification.data,
          requireInteraction: notification.priority === 'urgent',
        })
      }
    } catch (error) {
      console.error('Failed to deliver push notification:', error)
      notification.delivery_status['push'] = 'failed'
    }
  }

  private async deliverEmailNotification(notification: Notification): Promise<void> {
    // In production, this would integrate with an email service like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Supabase Email

    // For now, simulate delivery
    await new Promise(resolve => setTimeout(resolve, 200))
    notification.delivery_status['email'] = 'delivered'
  }

  private async deliverSMSNotification(notification: Notification): Promise<void> {
    // In production, this would integrate with an SMS service like:
    // - Twilio
    // - AWS SNS
    // - Vonage

    // For now, simulate delivery
    await new Promise(resolve => setTimeout(resolve, 300))
    notification.delivery_status['sms'] = 'delivered'
  }

  async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Service workers are not supported')
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }

  async subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
    if (typeof window === 'undefined' || !('PushManager' in window)) {
      console.log('Push messaging not supported')
      return null
    }

    try {
      // In production, you would get your VAPID keys from the server
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidKey) as any,
      })

      console.log('Push subscription successful:', subscription)
      return subscription
    } catch (error) {
      console.error('Push subscription failed:', error)
      return null
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary')
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }

  async savePushSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    // In production, this would save the subscription to your database
    // associated with the user's ID
    console.log('Saving push subscription for user:', userId)
    console.log('Subscription:', subscription)
  }

  private isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours.enabled) return false

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const [startHours, startMinutes] = preferences.quiet_hours.start.split(':').map(Number)
    const [endHours, endMinutes] = preferences.quiet_hours.end.split(':').map(Number)

    const startTime = startHours * 60 + startMinutes
    const endTime = endHours * 60 + endMinutes

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime < endTime
    }
  }

  async getUserNotifications(
    userId: string,
    options?: {
      unread_only?: boolean
      limit?: number
      offset?: number
      type?: Notification['type']
    }
  ): Promise<Notification[]> {
    const notifications = await this.db.getNotifications(
      userId,
      options?.unread_only || false,
      options?.limit || 20
    )

    let filtered = notifications

    if (options?.type) {
      filtered = filtered.filter(n => n.type === options.type)
    }

    if (options?.offset) {
      filtered = filtered.slice(options.offset)
    }

    return filtered as Notification[]
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.db.markNotificationAsRead(notificationId)
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db.markAllNotificationsAsRead(userId)
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.db.deleteNotification(notificationId)
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // In production, this would fetch from the database
    return {
      user_id: userId,
      enable_notifications: true,
      quiet_hours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
      },
      channels: {
        in_app: true,
        push: true,
        email: false,
        sms: false,
      },
      categories: {
        task_reminders: true,
        goal_milestones: true,
        achievements: true,
        streak_alerts: true,
        cognitive_alerts: true,
        social: false,
        system: true,
      },
      frequency: {
        immediate: true,
        daily_digest: false,
        weekly_summary: true,
      },
    }
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    // In production, this would update the database
    const current = await this.getUserPreferences(userId)
    const updated = { ...current, ...preferences }
    console.log('Updated notification preferences:', updated)
    return updated
  }

  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await this.getUserNotifications(userId, { unread_only: true })
    return notifications.length
  }

  async sendDigest(
    userId: string,
    type: 'daily' | 'weekly',
    data: {
      tasks_completed: number
      goals_progress: number
      streak_length: number
      achievements_unlocked: string[]
      insights: string[]
    }
  ): Promise<void> {
    const title = type === 'daily' ? 'Daily Summary' : 'Weekly Summary'
    const message = this.buildDigestMessage(type, data)

    await this.createNotification(userId, 'system', {
      system_title: title,
      system_message: message,
      action_required: false,
    })
  }

  private buildDigestMessage(type: string, data: any): string {
    if (type === 'daily') {
      return `Today you completed ${data.tasks_completed} tasks. Your streak is ${data.streak_length} days. Keep up the great work!`
    } else {
      return `This week you completed ${data.tasks_completed} tasks and made ${data.goals_progress}% progress on your goals. You unlocked ${data.achievements_unlocked.length} achievements!`
    }
  }
}
