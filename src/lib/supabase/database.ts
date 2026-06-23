// @ts-nocheck
import { createClient } from './client'

// Database table interfaces based on the schema
export interface DBGoal {
  id: string
  user_id: string
  title: string
  description?: string
  status: 'active' | 'completed' | 'paused'
  priority_score?: number
  progress?: number
  target_completion_date?: string
  created_at: string
  updated_at: string
}

export interface DBMicroAction {
  id: string
  goal_id: string
  user_id: string
  title: string
  description: string
  if_then_plan: string
  difficulty_score: number
  estimated_time_minutes: number
  status: 'pending' | 'selected' | 'completed' | 'skipped'
  created_at: string
  updated_at?: string
}

export interface DBActionCompletion {
  id: string
  action_id: string
  user_id: string
  completed_at: string
  confidence_score?: number
  effort_rating?: number
  emotional_state?: string
  barriers?: string
  facilitators?: string
  created_at: string
}

export interface DBBOSInsight {
  id: string
  user_id: string
  insight_type: 'motivational' | 'behavioral' | 'progress' | 'intervention'
  title: string
  content: string
  actionable_suggestion?: string
  created_at: string
  read: boolean
}

export interface DBCognitiveAssessment {
  id: string
  user_id: string
  assessment_date: string
  status: 'normal' | 'elevated' | 'overloaded'
  score: number
  responses: any
  lock_until: string | null
  lock_reason: string | null
  suggested_break_duration: number
  break_activities: string[]
  created_at: string
}

export interface DBWebhook {
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

export interface DBNotification {
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
  delivery_channels: string[]
  delivery_status: any
}

export interface DBGamificationProfile {
  user_id: string
  total_points: number
  level: number
  xp_to_next_level: number
  current_xp: number
  current_streak: number
  longest_streak: number
  total_tasks_completed: number
  total_goals_completed: number
  updated_at: string
}

export interface DBAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  progress: number
}

export class DatabaseService {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  // Goals
  async getGoals(userId: string): Promise<DBGoal[]> {
    const { data, error } = await this.supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getGoal(goalId: string): Promise<DBGoal | null> {
    const { data, error } = await this.supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single()

    if (error) throw error
    return data
  }

  async createGoal(goal: Omit<DBGoal, 'id' | 'created_at' | 'updated_at'>): Promise<DBGoal> {
    const { data, error } = await this.supabase
      .from('goals')
      .insert({
        ...goal,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateGoal(goalId: string, updates: Partial<DBGoal>): Promise<DBGoal> {
    // @ts-ignore
    const result = await this.supabase
      .from('goals')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .select()
      .single()

    if (result.error) throw result.error
    return result.data
  }

  async deleteGoal(goalId: string): Promise<void> {
    const { error } = await this.supabase
      .from('goals')
      .delete()
      .eq('id', goalId)

    if (error) throw error
  }

  // Micro Actions
  async getMicroActions(goalId: string): Promise<DBMicroAction[]> {
    const { data, error } = await this.supabase
      .from('micro_actions')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async createMicroAction(action: Omit<DBMicroAction, 'id' | 'created_at'>): Promise<DBMicroAction> {
    const { data, error } = await this.supabase
      .from('micro_actions')
      .insert({
        ...action,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateMicroAction(actionId: string, updates: Partial<DBMicroAction>): Promise<DBMicroAction> {
    // @ts-ignore
    const result = await this.supabase
      .from('micro_actions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actionId)
      .select()
      .single()

    if (result.error) throw result.error
    return result.data
  }

  // Action Completions
  async createActionCompletion(completion: Omit<DBActionCompletion, 'id' | 'created_at'>): Promise<DBActionCompletion> {
    const { data, error } = await this.supabase
      .from('action_completions')
      .insert({
        ...completion,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getActionCompletions(userId: string, limit = 50): Promise<DBActionCompletion[]> {
    const { data, error } = await this.supabase
      .from('action_completions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // BOS Insights
  async createInsight(insight: Omit<DBBOSInsight, 'id' | 'created_at'>): Promise<DBBOSInsight> {
    const { data, error } = await this.supabase
      .from('bos_insights')
      .insert({
        ...insight,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getInsights(userId: string, unreadOnly = false): Promise<DBBOSInsight[]> {
    let query = this.supabase
      .from('bos_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async markInsightAsRead(insightId: string): Promise<void> {
    // @ts-ignore
    const result = await this.supabase
      .from('bos_insights')
      .update({ read: true })
      .eq('id', insightId)

    if (result.error) throw result.error
  }

  // Cognitive Assessments
  async createCognitiveAssessment(assessment: Omit<DBCognitiveAssessment, 'id' | 'created_at'>): Promise<DBCognitiveAssessment> {
    const { data, error } = await this.supabase
      .from('cognitive_assessments')
      .insert({
        ...assessment,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getLatestCognitiveAssessment(userId: string): Promise<DBCognitiveAssessment | null> {
    const { data, error } = await this.supabase
      .from('cognitive_assessments')
      .select('*')
      .eq('user_id', userId)
      .order('assessment_date', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows returned
      throw error
    }
    return data
  }

  async createCognitiveLock(lock: {
    user_id: string
    locked_at: string
    lock_until: string
    lock_reason: string
    severity: 'mild' | 'moderate' | 'severe'
    break_suggestions: string[]
    chat_access_only: boolean
    assessment_required: boolean
  }): Promise<void> {
    const { error } = await this.supabase
      .from('cognitive_locks')
      .insert(lock)

    if (error) throw error
  }

  async getActiveCognitiveLock(userId: string): Promise<any | null> {
    const now = new Date().toISOString()
    const { data, error } = await this.supabase
      .from('cognitive_locks')
      .select('*')
      .eq('user_id', userId)
      .gt('lock_until', now)
      .order('locked_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows returned
      throw error
    }
    return data
  }

  // Webhooks
  async getWebhooks(userId: string): Promise<DBWebhook[]> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async createWebhook(webhook: Omit<DBWebhook, 'id' | 'created_at' | 'updated_at' | 'success_rate' | 'total_triggers' | 'failed_triggers'>): Promise<DBWebhook> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .insert({
        ...webhook,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        success_rate: 100,
        total_triggers: 0,
        failed_triggers: 0,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateWebhook(webhookId: string, updates: Partial<DBWebhook>): Promise<DBWebhook> {
    // @ts-ignore
    const result = await this.supabase
      .from('webhooks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhookId)
      .select()
      .single()

    if (result.error) throw result.error
    return result.data
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    const { error } = await this.supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId)

    if (error) throw error
  }

  // Notifications
  async getNotifications(userId: string, unreadOnly = false, limit = 20): Promise<DBNotification[]> {
    let query = this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async createNotification(notification: Omit<DBNotification, 'id' | 'created_at'>): Promise<DBNotification> {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        ...notification,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    // @ts-ignore
    const result = await this.supabase
      .from('notifications')
      .update({ 
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    if (result.error) throw result.error
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    // @ts-ignore
    const result = await this.supabase
      .from('notifications')
      .update({ 
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (result.error) throw result.error
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error
  }

  // Gamification
  async getGamificationProfile(userId: string): Promise<DBGamificationProfile | null> {
    const { data, error } = await this.supabase
      .from('gamification_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        return this.createGamificationProfile(userId)
      }
      throw error
    }
    return data
  }

  async createGamificationProfile(userId: string): Promise<DBGamificationProfile> {
    const { data, error } = await this.supabase
      .from('gamification_profiles')
      .insert({
        user_id: userId,
        total_points: 0,
        level: 1,
        xp_to_next_level: 100,
        current_xp: 0,
        current_streak: 0,
        longest_streak: 0,
        total_tasks_completed: 0,
        total_goals_completed: 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateGamificationProfile(userId: string, updates: Partial<DBGamificationProfile>): Promise<DBGamificationProfile> {
    // @ts-ignore
    const result = await this.supabase
      .from('gamification_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (result.error) throw result.error
    return result.data
  }

  async getAchievements(userId: string): Promise<DBAchievement[]> {
    const { data, error } = await this.supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<DBAchievement> {
    const { data, error } = await this.supabase
      .from('achievements')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
        progress: 100,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Singleton instance
export const db = new DatabaseService()
