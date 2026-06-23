import { DatabaseService } from '../supabase/database'

export interface Webhook {
  id: string
  user_id: string
  name: string
  url: string
  events: string[]
  secret: string
  active: boolean
  created_at: string
  updated_at: string
  last_triggered?: string
  success_rate: number
  total_triggers: number
  failed_triggers: number
}

export interface WebhookEvent {
  id: string
  webhook_id: string
  event_type: string
  payload: any
  status: 'pending' | 'success' | 'failed'
  response_code?: number
  response_body?: string
  error_message?: string
  created_at: string
  retried: boolean
  retry_count: number
}

export interface WebhookDeliveryLog {
  webhook_id: string
  event_id: string
  attempt_number: number
  status: 'success' | 'failed'
  response_code?: number
  response_time_ms: number
  error_message?: string
  timestamp: string
}

export interface WebhookTemplate {
  id: string
  name: string
  description: string
  events: string[]
  payload_schema: any
  example_payload: any
}

export class WebhookSystem {
  private db: DatabaseService
  private maxRetries = 3
  private retryDelay = 1000 // 1 second
  private timeout = 10000 // 10 seconds

  constructor() {
    this.db = new DatabaseService()
  }

  private availableEvents = [
    'task.completed',
    'task.created',
    'task.updated',
    'task.skipped',
    'goal.completed',
    'goal.created',
    'goal.updated',
    'goal.milestone_reached',
    'achievement.unlocked',
    'streak.achieved',
    'streak.lost',
    'cognitive.load_assessed',
    'cognitive.lock_applied',
    'user.registered',
    'user.updated',
    'quiz.completed',
    'quiz.passed',
    'quiz.failed',
  ]

  async createWebhook(
    userId: string,
    data: {
      name: string
      url: string
      events: string[]
      secret?: string
    }
  ): Promise<Webhook> {
    // Validate webhook URL
    await this.validateWebhookUrl(data.url)

    const webhook = await this.db.createWebhook({
      user_id: userId,
      name: data.name,
      url: data.url,
      events: data.events,
      secret: data.secret || this.generateSecret(),
      active: true,
    })

    return webhook
  }

  private generateSecret(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private async validateWebhookUrl(url: string): Promise<void> {
    try {
      const urlObj = new URL(url)
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid URL protocol')
      }
    } catch (error) {
      throw new Error('Invalid webhook URL')
    }
  }

  async triggerWebhook(userId: string, eventType: string, payload: any): Promise<void> {
    // Find all webhooks for this user that subscribe to this event
    const webhooks = await this.getWebhooksForEvent(userId, eventType)

    for (const webhook of webhooks) {
      await this.deliverWebhook(webhook, eventType, payload)
    }
  }

  private async getWebhooksForEvent(userId: string, eventType: string): Promise<Webhook[]> {
    const userWebhooks = await this.db.getWebhooks(userId)
    return userWebhooks.filter(webhook => 
      webhook.active && webhook.events.includes(eventType)
    )
  }

  private async deliverWebhook(
    webhook: Webhook,
    eventType: string,
    payload: any
  ): Promise<WebhookEvent> {
    const event: WebhookEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      webhook_id: webhook.id,
      event_type: eventType,
      payload: this.buildPayload(eventType, payload),
      status: 'pending',
      created_at: new Date().toISOString(),
      retried: false,
      retry_count: 0,
    }

    try {
      const signature = this.generateSignature(event.payload, webhook.secret)
      const response = await this.sendWebhookRequest(webhook.url, event.payload, signature)

      event.status = 'success'
      event.response_code = response.status
      event.response_body = await response.text()

      // Update webhook stats
      webhook.total_triggers++
      webhook.last_triggered = new Date().toISOString()
      webhook.success_rate = ((webhook.total_triggers - webhook.failed_triggers) / webhook.total_triggers) * 100
      
      await this.db.updateWebhook(webhook.id, {
        total_triggers: webhook.total_triggers,
        failed_triggers: webhook.failed_triggers,
        success_rate: webhook.success_rate,
        last_triggered: webhook.last_triggered,
      })
    } catch (error) {
      event.status = 'failed'
      event.error_message = error instanceof Error ? error.message : 'Unknown error'

      webhook.total_triggers++
      webhook.failed_triggers++
      webhook.success_rate = ((webhook.total_triggers - webhook.failed_triggers) / webhook.total_triggers) * 100

      await this.db.updateWebhook(webhook.id, {
        total_triggers: webhook.total_triggers,
        failed_triggers: webhook.failed_triggers,
        success_rate: webhook.success_rate,
      })

      // Schedule retry
      await this.scheduleRetry(webhook, event)
    }

    return event
  }

  private buildPayload(eventType: string, data: any): any {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    }
  }

  private generateSignature(payload: any, secret: string): string {
    const cryptoPayload = JSON.stringify(payload)
    // In production, this would use HMAC-SHA256
    return Buffer.from(cryptoPayload + secret).toString('base64')
  }

  private async sendWebhookRequest(
    url: string,
    payload: any,
    signature: string
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': new Date().toISOString(),
          'User-Agent': 'Behavioral-OS-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async scheduleRetry(webhook: Webhook, event: WebhookEvent): Promise<void> {
    if (event.retry_count >= this.maxRetries) {
      console.log(`Max retries reached for webhook ${webhook.id}`)
      return
    }

    event.retry_count++
    event.retried = true

    // Exponential backoff
    const delay = this.retryDelay * Math.pow(2, event.retry_count - 1)

    setTimeout(async () => {
      console.log(`Retrying webhook ${webhook.id} (attempt ${event.retry_count})`)
      await this.deliverWebhook(webhook, event.event_type, event.payload.data)
    }, delay)
  }

  async getUserWebhooks(userId: string): Promise<Webhook[]> {
    return await this.db.getWebhooks(userId)
  }

  async getWebhook(userId: string, webhookId: string): Promise<Webhook | null> {
    const webhooks = await this.db.getWebhooks(userId)
    return webhooks.find(w => w.id === webhookId) || null
  }

  async updateWebhook(
    userId: string,
    webhookId: string,
    updates: Partial<Pick<Webhook, 'name' | 'url' | 'events' | 'secret' | 'active'>>
  ): Promise<Webhook> {
    const webhook = await this.getWebhook(userId, webhookId)
    if (!webhook) {
      throw new Error('Webhook not found')
    }

    if (updates.url) {
      await this.validateWebhookUrl(updates.url)
    }

    const updated = await this.db.updateWebhook(webhookId, updates)
    return updated
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.db.deleteWebhook(webhookId)
  }

  async testWebhook(userId: string, webhookId: string): Promise<{ success: boolean; response?: any; error?: string }> {
    const webhook = await this.getWebhook(userId, webhookId)
    if (!webhook) {
      return { success: false, error: 'Webhook not found' }
    }

    const testPayload = {
      test: true,
      message: 'Webhook test from Behavioral OS',
      timestamp: new Date().toISOString(),
    }

    try {
      const signature = this.generateSignature(testPayload, webhook.secret)
      const response = await this.sendWebhookRequest(webhook.url, testPayload, signature)
      const responseBody = await response.text()

      return {
        success: true,
        response: {
          status: response.status,
          body: responseBody,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async getWebhookEvents(webhookId: string, limit: number = 50): Promise<WebhookEvent[]> {
    // In production, this would query the database
    return []
  }

  async getWebhookStats(webhookId: string): Promise<{
    total_triggers: number
    success_rate: number
    average_response_time: number
    last_triggered: string | null
    recent_errors: string[]
  }> {
    const webhook = await this.getWebhook(webhookId)
    if (!webhook) {
      throw new Error('Webhook not found')
    }

    const events = await this.getWebhookEvents(webhookId, 100)
    const successfulEvents = events.filter(e => e.status === 'success')
    const failedEvents = events.filter(e => e.status === 'failed')

    return {
      total_triggers: webhook.total_triggers,
      success_rate: webhook.success_rate,
      average_response_time: 150, // Mock value
      last_triggered: webhook.last_triggered || null,
      recent_errors: failedEvents.slice(0, 5).map(e => e.error_message || 'Unknown error'),
    }
  }

  getAvailableEvents(): string[] {
    return this.availableEvents
  }

  getWebhookTemplates(): WebhookTemplate[] {
    return [
      {
        id: 'task_completion',
        name: 'Task Completion',
        description: 'Triggered when a task is completed',
        events: ['task.completed'],
        payload_schema: {
          task_id: 'string',
          task_title: 'string',
          user_id: 'string',
          completed_at: 'string',
          confidence_score: 'number',
        },
        example_payload: {
          task_id: 'task_123',
          task_title: 'Complete TypeScript tutorial',
          user_id: 'user_456',
          completed_at: '2024-01-15T10:30:00Z',
          confidence_score: 0.85,
        },
      },
      {
        id: 'goal_milestone',
        name: 'Goal Milestone',
        description: 'Triggered when a goal reaches a milestone',
        events: ['goal.milestone_reached'],
        payload_schema: {
          goal_id: 'string',
          goal_title: 'string',
          user_id: 'string',
          milestone_type: 'string',
          progress: 'number',
        },
        example_payload: {
          goal_id: 'goal_789',
          goal_title: 'Learn TypeScript',
          user_id: 'user_456',
          milestone_type: 'halfway',
          progress: 50,
        },
      },
      {
        id: 'achievement_unlocked',
        name: 'Achievement Unlocked',
        description: 'Triggered when a user unlocks an achievement',
        events: ['achievement.unlocked'],
        payload_schema: {
          achievement_id: 'string',
          achievement_title: 'string',
          user_id: 'string',
          points: 'number',
          unlocked_at: 'string',
        },
        example_payload: {
          achievement_id: 'streak_7',
          achievement_title: 'Week Warrior',
          user_id: 'user_456',
          points: 50,
          unlocked_at: '2024-01-15T10:30:00Z',
        },
      },
      {
        id: 'cognitive_alert',
        name: 'Cognitive Alert',
        description: 'Triggered when cognitive load assessment indicates issues',
        events: ['cognitive.load_assessed', 'cognitive.lock_applied'],
        payload_schema: {
          user_id: 'string',
          status: 'string',
          score: 'number',
          recommendation: 'string',
          assessed_at: 'string',
        },
        example_payload: {
          user_id: 'user_456',
          status: 'overloaded',
          score: 85,
          recommendation: 'Take a 30-minute break',
          assessed_at: '2024-01-15T10:30:00Z',
        },
      },
    ]
  }

  async regenerateSecret(webhookId: string): Promise<string> {
    const webhook = await this.getWebhook(webhookId)
    if (!webhook) {
      throw new Error('Webhook not found')
    }

    const newSecret = this.generateSecret()
    await this.updateWebhook(webhookId, { secret: newSecret })

    return newSecret
  }
}
