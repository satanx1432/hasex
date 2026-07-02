'use client'

import { getGuestData, setGuestData } from '@/lib/data/guest-data'

interface AnalyticsEvent {
  eventType: string
  timestamp: string
  sessionId: string
  data?: Record<string, any>
}

class AnalyticsTracker {
  private sessionId: string
  private isEnabled: boolean

  constructor() {
    this.sessionId = this.getOrCreateSessionId()
    this.isEnabled = this.getAnalyticsPreference()
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server'
    
    let sessionId = localStorage.getItem('analytics_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('analytics_session_id', sessionId)
    }
    return sessionId
  }

  private getAnalyticsPreference(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('analytics_enabled') !== 'false'
  }

  public setAnalyticsEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    if (typeof window !== 'undefined') {
      localStorage.setItem('analytics_enabled', enabled.toString())
    }
  }

  public track(eventType: string, data?: Record<string, any>): void {
    if (!this.isEnabled) return

    const event: AnalyticsEvent = {
      eventType,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      data
    }

    // Store locally for guest users
    this.storeEvent(event)
  }

  private storeEvent(event: AnalyticsEvent): void {
    if (typeof window === 'undefined') return

    try {
      const events = getGuestData('analytics_events') || []
      events.push(event)
      
      // Keep only last 100 events to avoid storage issues
      if (events.length > 100) {
        events.splice(0, events.length - 100)
      }
      
      setGuestData('analytics_events', events)
    } catch (error) {
      console.error('Failed to store analytics event:', error)
    }
  }

  public getEvents(): AnalyticsEvent[] {
    if (typeof window === 'undefined') return []
    return getGuestData('analytics_events') || []
  }

  public clearEvents(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('guest_analytics_events')
  }

  // Predefined event types
  public trackPageView(pageName: string): void {
    this.track('page_view', { pageName })
  }

  public trackTaskCompletion(taskId: string, duration: number): void {
    this.track('task_completion', { taskId, duration })
  }

  public trackGoalCreation(goalId: string): void {
    this.track('goal_creation', { goalId })
  }

  public trackFeatureUsage(feature: string): void {
    this.track('feature_usage', { feature })
  }

  public trackError(errorType: string, errorMessage: string): void {
    this.track('error', { errorType, errorMessage })
  }

  public getAnalyticsSummary(): {
    totalEvents: number
    eventsByType: Record<string, number>
    activeDays: number
  } {
    const events = this.getEvents()
    const eventsByType: Record<string, number> = {}
    const uniqueDays = new Set<string>()

    events.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1
      uniqueDays.add(event.timestamp.split('T')[0])
    })

    return {
      totalEvents: events.length,
      eventsByType,
      activeDays: uniqueDays.size
    }
  }
}

// Singleton instance
let trackerInstance: AnalyticsTracker | null = null

export function getAnalyticsTracker(): AnalyticsTracker {
  if (!trackerInstance) {
    trackerInstance = new AnalyticsTracker()
  }
  return trackerInstance
}

// Simple export for direct usage
export function trackEvent(eventType: string, data?: Record<string, any>): void {
  if (typeof window === 'undefined') return
  const tracker = getAnalyticsTracker()
  tracker.track(eventType, data)
}

export function useAnalytics() {
  const tracker = getAnalyticsTracker()
  
  return {
    track: (eventType: string, data?: Record<string, any>) => tracker.track(eventType, data),
    trackPageView: (pageName: string) => tracker.trackPageView(pageName),
    trackTaskCompletion: (taskId: string, duration: number) => tracker.trackTaskCompletion(taskId, duration),
    trackGoalCreation: (goalId: string) => tracker.trackGoalCreation(goalId),
    trackFeatureUsage: (feature: string) => tracker.trackFeatureUsage(feature),
    trackError: (errorType: string, errorMessage: string) => tracker.trackError(errorType, errorMessage),
    setAnalyticsEnabled: (enabled: boolean) => tracker.setAnalyticsEnabled(enabled),
    getAnalyticsSummary: () => tracker.getAnalyticsSummary(),
    isEnabled: () => tracker['isEnabled']
  }
}