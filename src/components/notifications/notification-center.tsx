'use client'

import { useState, useEffect } from 'react'
import { NotificationSystem, Notification } from '@/lib/notifications/notification-system'

interface NotificationCenterProps {
  userId: string
  onClose?: () => void
}

export default function NotificationCenter({ userId, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showPreferences, setShowPreferences] = useState(false)

  const notificationSystem = new NotificationSystem()

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
  }, [filter])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const data = await notificationSystem.getUserNotifications(userId, {
        unread_only: filter === 'unread',
        limit: 20,
      })
      setNotifications(data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const count = await notificationSystem.getUnreadCount(userId)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load unread count:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationSystem.markAsRead(notificationId)
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n))
    )
    loadUnreadCount()
  }

  const handleMarkAllAsRead = async () => {
    await notificationSystem.markAllAsRead(userId)
    setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })))
    setUnreadCount(0)
  }

  const handleDelete = async (notificationId: string) => {
    await notificationSystem.deleteNotification(notificationId)
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    loadUnreadCount()
  }

  const handleAction = (notification: Notification) => {
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
    handleMarkAsRead(notification.id)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-error'
      case 'high':
        return 'bg-secondary'
      case 'medium':
        return 'bg-primary'
      case 'low':
        return 'bg-surface-variant'
      default:
        return 'bg-surface-variant'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task_reminder':
        return 'task_alt'
      case 'goal_milestone':
        return 'flag'
      case 'achievement_unlocked':
        return 'emoji_events'
      case 'streak_alert':
        return 'local_fire_department'
      case 'cognitive_alert':
        return 'psychology'
      case 'social':
        return 'people'
      case 'system':
        return 'info'
      default:
        return 'notifications'
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (showPreferences) {
    return <NotificationPreferences userId={userId} onBack={() => setShowPreferences(false)} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div className="bg-surface border border-border rounded-2xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="font-headline-lg text-headline-lg text-primary">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-primary text-background font-label-mono text-label-mono text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreferences(true)}
              className="material-symbols-outlined text-primary"
              data-icon="settings"
            >
              settings
            </button>
            <button
              onClick={onClose}
              className="material-symbols-outlined text-primary"
              data-icon="close"
            >
              close
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 p-4 border-b border-border">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-4 font-label-mono text-label-mono text-center rounded-lg transition-all ${
              filter === 'all' ? 'bg-primary text-background' : 'bg-surface-variant text-on-surface-variant'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 py-2 px-4 font-label-mono text-label-mono text-center rounded-lg transition-all ${
              filter === 'unread' ? 'bg-primary text-background' : 'bg-surface-variant text-on-surface-variant'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Mark all as read */}
        {unreadCount > 0 && (
          <div className="p-4 border-b border-border">
            <button
              onClick={handleMarkAllAsRead}
              className="w-full text-primary font-label-mono text-label-mono py-2 hover:underline"
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2" data-icon="notifications_none">
                notifications_none
              </span>
              <p className="font-body-md text-body-md text-on-surface-variant">
                No {filter === 'unread' ? 'unread' : ''} notifications
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-surface-variant transition-all cursor-pointer ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getPriorityColor(
                      notification.priority
                    )}`}>
                      <span
                        className="material-symbols-outlined text-background"
                        data-icon={getTypeIcon(notification.type)}
                      >
                        {getTypeIcon(notification.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-headline-md text-headline-md text-primary">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                          {formatTime(notification.created_at)}
                        </span>
                        <div className="flex items-center gap-2">
                          {notification.action_label && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAction(notification)
                              }}
                              className="text-primary font-label-mono text-label-mono text-xs hover:underline"
                            >
                              {notification.action_label}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(notification.id)
                            }}
                            className="material-symbols-outlined text-on-surface-variant text-sm hover:text-error"
                            data-icon="delete"
                          >
                            delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationPreferences({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [preferences, setPreferences] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const notificationSystem = new NotificationSystem()

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    setIsLoading(true)
    try {
      const prefs = await notificationSystem.getUserPreferences(userId)
      setPreferences(prefs)
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreference = async (key: string, value: any) => {
    const updated = { ...preferences, [key]: value }
    setPreferences(updated)
    await notificationSystem.updateUserPreferences(userId, updated)
  }

  const updateChannel = async (channel: string, enabled: boolean) => {
    const updated = {
      ...preferences,
      channels: { ...preferences.channels, [channel]: enabled },
    }
    setPreferences(updated)
    await notificationSystem.updateUserPreferences(userId, updated)
  }

  const updateCategory = async (category: string, enabled: boolean) => {
    const updated = {
      ...preferences,
      categories: { ...preferences.categories, [category]: enabled },
    }
    setPreferences(updated)
    await notificationSystem.updateUserPreferences(userId, updated)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="material-symbols-outlined text-primary"
          data-icon="arrow_back"
        >
          arrow_back
        </button>
        <h2 className="font-headline-lg text-headline-lg text-primary">Notification Settings</h2>
      </div>

      {/* Enable/Disable */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="font-body-md text-body-md text-on-surface">Enable Notifications</span>
          <button
            onClick={() => updatePreference('enable_notifications', !preferences.enable_notifications)}
            className={`w-12 h-6 rounded-full transition-all ${
              preferences.enable_notifications ? 'bg-primary' : 'bg-surface-variant'
            }`}
          >
            <div
              className={`w-5 h-5 bg-background rounded-full transition-all ${
                preferences.enable_notifications ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="mb-6">
        <h3 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-3">
          Quiet Hours
        </h3>
        <div className="flex items-center justify-between mb-3">
          <span className="font-body-md text-body-md text-on-surface">Enable Quiet Hours</span>
          <button
            onClick={() =>
              updatePreference('quiet_hours', {
                ...preferences.quiet_hours,
                enabled: !preferences.quiet_hours.enabled,
              })
            }
            className={`w-12 h-6 rounded-full transition-all ${
              preferences.quiet_hours.enabled ? 'bg-primary' : 'bg-surface-variant'
            }`}
          >
            <div
              className={`w-5 h-5 bg-background rounded-full transition-all ${
                preferences.quiet_hours.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        {preferences.quiet_hours.enabled && (
          <div className="flex gap-2">
            <input
              type="time"
              value={preferences.quiet_hours.start}
              onChange={(e) =>
                updatePreference('quiet_hours', {
                  ...preferences.quiet_hours,
                  start: e.target.value,
                })
              }
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface"
            />
            <span className="font-body-md text-body-md text-on-surface-variant self-center">to</span>
            <input
              type="time"
              value={preferences.quiet_hours.end}
              onChange={(e) =>
                updatePreference('quiet_hours', {
                  ...preferences.quiet_hours,
                  end: e.target.value,
                })
              }
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 font-body-md text-body-md text-on-surface"
            />
          </div>
        )}
      </div>

      {/* Channels */}
      <div className="mb-6">
        <h3 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-3">
          Delivery Channels
        </h3>
        <div className="space-y-3">
          {(['in_app', 'push', 'email', 'sms'] as const).map(channel => (
            <div key={channel} className="flex items-center justify-between">
              <span className="font-body-md text-body-md text-on-surface capitalize">
                {channel.replace('_', ' ')}
              </span>
              <button
                onClick={() => updateChannel(channel, !preferences.channels[channel])}
                className={`w-12 h-6 rounded-full transition-all ${
                  preferences.channels[channel] ? 'bg-primary' : 'bg-surface-variant'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-background rounded-full transition-all ${
                    preferences.channels[channel] ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6">
        <h3 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-3">
          Notification Categories
        </h3>
        <div className="space-y-3">
          {[
            'task_reminders',
            'goal_milestones',
            'achievements',
            'streak_alerts',
            'cognitive_alerts',
            'social',
            'system',
          ].map(category => (
            <div key={category} className="flex items-center justify-between">
              <span className="font-body-md text-body-md text-on-surface capitalize">
                {category.replace('_', ' ')}
              </span>
              <button
                onClick={() => updateCategory(category, !preferences.categories[category])}
                className={`w-12 h-6 rounded-full transition-all ${
                  preferences.categories[category] ? 'bg-primary' : 'bg-surface-variant'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-background rounded-full transition-all ${
                    preferences.categories[category] ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Frequency */}
      <div>
        <h3 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-3">
          Digest Frequency
        </h3>
        <div className="space-y-3">
          {(['immediate', 'daily_digest', 'weekly_summary'] as const).map(freq => (
            <div key={freq} className="flex items-center justify-between">
              <span className="font-body-md text-body-md text-on-surface capitalize">
                {freq.replace('_', ' ')}
              </span>
              <button
                onClick={() =>
                  updatePreference('frequency', {
                    ...preferences.frequency,
                    [freq]: !preferences.frequency[freq],
                  })
                }
                className={`w-12 h-6 rounded-full transition-all ${
                  preferences.frequency[freq] ? 'bg-primary' : 'bg-surface-variant'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-background rounded-full transition-all ${
                    preferences.frequency[freq] ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
