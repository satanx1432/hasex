/**
 * AI Observation System
 * 
 * Provides the AI with the four critical questions:
 * 1. What does the user want?
 * 2. What blocks them?
 * 3. Are they improving?
 * 4. What action has highest leverage?
 */

// @ts-nocheck
import { createClient } from './supabase/client'
import { getCoreMetrics } from './metrics'

interface AIObservations {
  what_user_wants: string
  what_blocks_them: string
  whether_improving: boolean
  highest_leverage_action: string
  confidence_level: 'high' | 'medium' | 'low'
  reasoning: string
}

class ObservationSystem {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  /**
   * Get AI observations about the user
   * This answers the four critical questions the AI needs to know
   */
  async getObservations(userId: string): Promise<AIObservations> {
    try {
      // Get current goal
      const { data: activeGoal } = await this.supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      // Get core metrics
      const metrics = await getCoreMetrics(userId)

      // Get recent conversation history
      const recentConversations = await this.getRecentConversations(userId)

      // Get recent completions
      const recentCompletions = await this.getRecentCompletions(userId)

      // Answer the four questions
      const what_user_wants = this.determineWhatUserWants(activeGoal, recentConversations)
      const what_blocks_them = this.determineWhatBlocksThem(metrics, recentCompletions)
      const whether_improving = metrics.behavior_trend === 'improving'
      const highest_leverage_action = await this.determineHighestLeverageAction(userId, activeGoal, metrics)
      const confidence_level = this.determineConfidenceLevel(activeGoal, recentConversations.length)
      const reasoning = this.generateReasoning(metrics, activeGoal)

      return {
        what_user_wants,
        what_blocks_them,
        whether_improving,
        highest_leverage_action,
        confidence_level,
        reasoning
      }
    } catch (error) {
      console.error('Error getting AI observations:', error)
      return this.getDefaultObservations()
    }
  }

  private determineWhatUserWants(goal: any, conversations: any[]): string {
    if (!goal) return 'No active goal set'

    // Analyze goal description
    const goalTitle = goal.title
    const goalDescription = goal.description || ''

    // Look for patterns in recent conversations
    const conversationTopics = conversations
      .filter(c => c.role === 'user')
      .map(c => c.content)
      .join(' ')

    // Extract primary motivation
    if (goalDescription.toLowerCase().includes('want to become')) {
      return `Become ${goalTitle}`
    }
    if (goalDescription.toLowerCase().includes('want to achieve')) {
      return `Achieve ${goalTitle}`
    }
    if (goalDescription.toLowerCase().includes('want to build')) {
      return `Build ${goalTitle}`
    }

    return goalTitle
  }

  private determineWhatBlocksThem(metrics: any, completions: any[]): string {
    const blockers: string[] = []

    // Check consistency
    if (metrics.consistency_score < 50) {
      blockers.push('inconsistent activity patterns')
    }

    // Check follow-through
    if (metrics.follow_through_rate < 60) {
      blockers.push('low follow-through on commitments')
    }

    // Check momentum
    if (metrics.momentum_score < 40) {
      blockers.push('low momentum and motivation')
    }

    // Check recent failures
    const recentFailures = completions.filter(c => c.status === 'failed').length
    if (recentFailures > 3) {
      blockers.push('recent setbacks and failures')
    }

    // Check abandonment
    if (metrics.goal_success_probability < 40) {
      blockers.push('pattern of goal abandonment')
    }

    if (blockers.length === 0) {
      return 'No major blocks identified - user is progressing well'
    }

    return blockers.slice(0, 2).join(', ')
  }

  private async determineHighestLeverageAction(userId: string, goal: any, metrics: any): Promise<string> {
    if (!goal) return 'Set a clear goal to identify highest leverage actions'

    // Get today's mission
    const { data: todayMission } = await this.supabase
        .from('daily_missions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date().toISOString().split('T')[0])
        .order('importance', { ascending: false })
        .limit(1)
        .single()

    if (todayMission) {
      return todayMission.title
    }

    // If no today's mission, suggest based on metrics
    if (metrics.consistency_score < 50) {
      return 'Establish daily consistency with small, achievable actions'
    }
    if (metrics.follow_through_rate < 60) {
      return 'Focus on completing current commitments before adding new ones'
    }
    if (metrics.momentum_score < 40) {
      return 'Take one high-impact action today to build momentum'
    }

    return 'Continue with current milestone activities'
  }

  private determineConfidenceLevel(goal: any, conversationCount: number): 'high' | 'medium' | 'low' {
    if (!goal) return 'low'
    if (conversationCount < 3) return 'low'
    if (conversationCount < 10) return 'medium'
    return 'high'
  }

  private generateReasoning(metrics: any, goal: any): string {
    const parts: string[] = []

    if (goal) {
      parts.push(`User has active goal: "${goal.title}"`)
    }

    if (metrics.consistency_score > 70) {
      parts.push('Shows strong consistency in action')
    } else if (metrics.consistency_score < 40) {
      parts.push('Struggles with consistent action')
    }

    if (metrics.behavior_trend === 'improving') {
      parts.push('Behavior trend is improving')
    } else if (metrics.behavior_trend === 'declining') {
      parts.push('Behavior trend is declining')
    }

    if (metrics.momentum_score > 60) {
      parts.push('Building positive momentum')
    }

    return parts.join('. ') || 'Limited data available for reasoning'
  }

  private async getRecentConversations(userId: string): Promise<any[]> {
    try {
      const { data } = await this.supabase
        .from('conversation_memories')
        .select('messages')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(5)

      if (!data) return []

      const allMessages = data.flatMap(c => c.messages || [])
      return allMessages.slice(-10) // Last 10 messages
    } catch (error) {
      return []
    }
  }

  private async getRecentCompletions(userId: string): Promise<any[]> {
    try {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const { data } = await this.supabase
        .from('action_completions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', weekAgo.toISOString())

      return data || []
    } catch (error) {
      return []
    }
  }

  private getDefaultObservations(): AIObservations {
    return {
      what_user_wants: 'Not enough data yet',
      what_blocks_them: 'Not enough data yet',
      whether_improving: false,
      highest_leverage_action: 'Continue conversation to establish patterns',
      confidence_level: 'low',
      reasoning: 'Need more conversation data and action history'
    }
  }
}

// Singleton instance
export const observationSystem = new ObservationSystem()

// Convenience function
export const getAIObservations = (userId: string) => observationSystem.getObservations(userId)
