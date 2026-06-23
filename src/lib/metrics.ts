/**
 * Core Metrics Calculation System
 * 
 * Shared metrics calculation for all screens:
 * 1. Consistency Score (0-100) - How often user does what they promised
 * 2. Momentum Score (0-100) - Weighted score: recent activity, streaks, completed actions, improvement rate
 * 3. Follow-through Rate - completed actions / promised actions
 * 4. Goal Success Probability - AI estimate based on history, consistency, obstacles, motivation, pace
 * 5. Behavior Trend - Improving ↑ Declining ↓ Stable →
 */

// @ts-nocheck
import { createClient } from './supabase/client'

interface CoreMetrics {
  consistency_score: number
  momentum_score: number
  follow_through_rate: number
  goal_success_probability: number
  behavior_trend: 'improving' | 'declining' | 'stable'
}

interface DetailedMetrics {
  days_active: number
  tasks_completed: number
  weekly_consistency: number
  goal_completion: number
  consecutive_successful_days: number
  current_streak: number
  weekly_improvement: number
  time_invested_hours: number
  goal_abandonment_rate: number
  average_active_days_per_week: number
  average_response_time_hours: number
}

export class MetricsCalculator {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  /**
   * 1. CONSISTENCY SCORE (0-100)
   * How often user does what they promised
   */
  async calculateConsistencyScore(userId: string): Promise<number> {
    try {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const { data: weeklyActions } = await this.supabase
        .from('action_completions')
        .select('date')
        .eq('user_id', userId)
        .gte('date', weekAgo.toISOString())

      const uniqueDays = new Set(weeklyActions?.map((a: any) => a.date.split('T')[0]) || []).size
      
      // Base consistency on weekly activity
      const weeklyConsistency = (uniqueDays / 7) * 100

      // Factor in longer-term consistency (last 30 days)
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)

      const { data: monthlyActions } = await this.supabase
        .from('action_completions')
        .select('date')
        .eq('user_id', userId)
        .gte('date', monthAgo.toISOString())

      const uniqueMonthlyDays = new Set(monthlyActions?.map((a: any) => a.date.split('T')[0]) || []).size
      const monthlyConsistency = (uniqueMonthlyDays / 30) * 100

      // Weight recent consistency more heavily
      return (weeklyConsistency * 0.7) + (monthlyConsistency * 0.3)
    } catch (error) {
      console.error('Error calculating consistency score:', error)
      return 50
    }
  }

  /**
   * 2. MOMENTUM SCORE (0-100)
   * Weighted score: recent activity (40%) + streaks (30%) + completed actions (20%) + improvement rate (10%)
   */
  async calculateMomentumScore(userId: string): Promise<number> {
    try {
      const weeklyConsistency = await this.calculateConsistencyScore(userId)
      
      // Get current streak
      const { data: userProfile } = await this.supabase
        .from('user_profiles')
        .select('current_streak')
        .eq('user_id', userId)
        .single()

      const currentStreak = userProfile?.current_streak || 0

      // Recent activity (last 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const { count: recentCompletions } = await this.supabase
        .from('action_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', weekAgo.toISOString())

      // Improvement rate (compare this week to last week)
      const thisWeek = new Date()
      thisWeek.setDate(thisWeek.getDate() - 7)
      
      const lastWeek = new Date()
      lastWeek.setDate(lastWeek.getDate() - 14)

      const { count: thisWeekCount } = await this.supabase
        .from('action_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', thisWeek.toISOString())

      const { count: lastWeekCount } = await this.supabase
        .from('action_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', lastWeek.toISOString())
        .lt('created_at', thisWeek.toISOString())

      const improvementRate = lastWeekCount ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100 : 0

      // Calculate weighted score
      const recentActivity = (weeklyConsistency / 100) * 40
      const streakScore = Math.min(currentStreak / 30, 1) * 30
      const actionsScore = Math.min((recentCompletions || 0) / 20, 1) * 20
      const improvementScore = Math.min(Math.max(improvementRate / 20, -1), 1) * 10

      const totalScore = recentActivity + streakScore + actionsScore + improvementScore

      return Math.max(0, Math.min(100, totalScore))
    } catch (error) {
      console.error('Error calculating momentum score:', error)
      return 50
    }
  }

  /**
   * 3. FOLLOW-THROUGH RATE
   * completed actions / promised actions
   */
  async calculateFollowThroughRate(userId: string): Promise<number> {
    try {
      const { data: allMissions } = await this.supabase
        .from('daily_missions')
        .select('id')
        .eq('user_id', userId)

      const { data: completedMissions } = await this.supabase
        .from('action_completions')
        .select('mission_id')
        .eq('user_id', userId)
        .eq('status', 'completed')

      if (!allMissions || allMissions.length === 0) return 50

      const uniqueCompleted = new Set(completedMissions?.map((c: any) => c.mission_id) || []).size
      return (uniqueCompleted / allMissions.length) * 100
    } catch (error) {
      console.error('Error calculating follow-through rate:', error)
      return 50
    }
  }

  /**
   * 4. GOAL SUCCESS PROBABILITY
   * AI estimate based on: history, consistency, obstacles, motivation, pace
   */
  async calculateGoalSuccessProbability(userId: string): Promise<number> {
    try {
      const { data: activeGoal } = await this.supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (!activeGoal) return 0

      let probability = 50 // Base probability

      // Consistency factor (30% weight)
      const consistencyScore = await this.calculateConsistencyScore(userId)
      probability += (consistencyScore - 50) * 0.3

      // Progress rate factor (20% weight)
      const progressRate = await this.getProgressRate(userId, activeGoal.id)
      probability += (progressRate - 50) * 0.2

      // Time remaining factor (15% weight)
      if (activeGoal.deadline) {
        const daysRemaining = Math.ceil((new Date(activeGoal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        if (daysRemaining > 90) probability += 15
        else if (daysRemaining < 30) probability -= 20
      }

      // Follow-through factor (20% weight)
      const followThrough = await this.calculateFollowThroughRate(userId)
      probability += (followThrough - 50) * 0.2

      // Past failure rate factor (15% weight)
      const failureRate = await this.getPastFailureRate(userId)
      probability -= failureRate * 15

      return Math.max(5, Math.min(95, probability))
    } catch (error) {
      console.error('Error calculating goal success probability:', error)
      return 50
    }
  }

  /**
   * 5. BEHAVIOR TREND
   * Improving ↑ Declining ↓ Stable →
   */
  async calculateBehaviorTrend(userId: string): Promise<'improving' | 'declining' | 'stable'> {
    try {
      // Compare this week to last week
      const thisWeek = new Date()
      thisWeek.setDate(thisWeek.getDate() - 7)
      
      const lastWeek = new Date()
      lastWeek.setDate(lastWeek.getDate() - 14)

      const { count: thisWeekCount } = await this.supabase
        .from('action_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', thisWeek.toISOString())

      const { count: lastWeekCount } = await this.supabase
        .from('action_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', lastWeek.toISOString())
        .lt('created_at', thisWeek.toISOString())

      if (!lastWeekCount) return 'stable'

      const ratio = thisWeekCount / lastWeekCount
      
      if (ratio > 1.1) return 'improving'
      if (ratio < 0.9) return 'declining'
      return 'stable'
    } catch (error) {
      console.error('Error calculating behavior trend:', error)
      return 'stable'
    }
  }

  /**
   * Get all core metrics at once
   */
  async getAllCoreMetrics(userId: string): Promise<CoreMetrics> {
    const [
      consistency_score,
      momentum_score,
      follow_through_rate,
      goal_success_probability,
      behavior_trend
    ] = await Promise.all([
      this.calculateConsistencyScore(userId),
      this.calculateMomentumScore(userId),
      this.calculateFollowThroughRate(userId),
      this.calculateGoalSuccessProbability(userId),
      this.calculateBehaviorTrend(userId)
    ])

    return {
      consistency_score,
      momentum_score,
      follow_through_rate,
      goal_success_probability,
      behavior_trend
    }
  }

  /**
   * Get detailed metrics for deeper analysis
   */
  async getDetailedMetrics(userId: string): Promise<DetailedMetrics> {
    try {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)

      const [
        days_active,
        tasks_completed,
        weekly_consistency,
        goal_completion,
        current_streak,
        weekly_improvement,
        time_invested,
        goal_abandonment,
        average_active_days,
        response_time
      ] = await Promise.all([
        this.getDaysActive(userId),
        this.getTasksCompleted(userId),
        this.getWeeklyConsistency(userId),
        this.getGoalCompletion(userId),
        this.getCurrentStreak(userId),
        this.getWeeklyImprovement(userId),
        this.getTimeInvested(userId),
        this.getGoalAbandonmentRate(userId),
        this.getAverageActiveDaysPerWeek(userId),
        this.getAverageResponseTime(userId)
      ])

      const consecutive_successful_days = await this.getConsecutiveSuccessfulDays(userId)

      return {
        days_active,
        tasks_completed,
        weekly_consistency,
        goal_completion,
        consecutive_successful_days,
        current_streak,
        weekly_improvement,
        time_invested_hours: time_invested,
        goal_abandonment_rate: goal_abandonment,
        average_active_days_per_week: average_active_days,
        average_response_time_hours: response_time
      }
    } catch (error) {
      console.error('Error getting detailed metrics:', error)
      return this.getDefaultDetailedMetrics()
    }
  }

  // Helper methods
  private async getDaysActive(userId: string): Promise<number> {
    const { count } = await this.supabase
      .from('action_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    return count || 0
  }

  private async getTasksCompleted(userId: string): Promise<number> {
    const { count } = await this.supabase
      .from('action_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed')
    return count || 0
  }

  private async getWeeklyConsistency(userId: string): Promise<number> {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { data: weeklyActions } = await this.supabase
      .from('action_completions')
      .select('date')
      .eq('user_id', userId)
      .gte('date', weekAgo.toISOString())

    const uniqueDays = new Set(weeklyActions?.map(a => a.date.split('T')[0]) || []).size
    return (uniqueDays / 7) * 100
  }

  private async getGoalCompletion(userId: string): Promise<number> {
    const { data: allGoals } = await this.supabase
      .from('goals')
      .select('status')
      .eq('user_id', userId)
    
    const completedGoals = allGoals?.filter(g => g.status === 'completed').length || 0
    return allGoals?.length ? (completedGoals / allGoals.length) * 100 : 0
  }

  private async getCurrentStreak(userId: string): Promise<number> {
    const { data: userProfile } = await this.supabase
      .from('user_profiles')
      .select('current_streak')
      .eq('user_id', userId)
      .single()
    
    return userProfile?.current_streak || 0
  }

  private async getWeeklyImprovement(userId: string): Promise<number> {
    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - 7)
    
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 14)

    const { count: thisWeekCount } = await this.supabase
      .from('action_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thisWeek.toISOString())

    const { count: lastWeekCount } = await this.supabase
      .from('action_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', lastWeek.toISOString())
      .lt('created_at', thisWeek.toISOString())

    if (!lastWeekCount) return 0
    return ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100
  }

  private async getTimeInvested(userId: string): Promise<number> {
    const { data: completions } = await this.supabase
      .from('action_completions')
      .select('time_spent')
      .eq('user_id', userId)

    if (!completions) return 0
    return completions.reduce((total, comp) => total + (comp.time_spent || 0), 0)
  }

  private async getGoalAbandonmentRate(userId: string): Promise<number> {
    const { data: abandonedGoals } = await this.supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'abandoned')

    const { data: allGoals } = await this.supabase
      .from('goals')
      .select('id')
      .eq('user_id', userId)

    if (!allGoals || allGoals.length === 0) return 0
    return (abandonedGoals?.length || 0) / allGoals.length * 100
  }

  private async getAverageActiveDaysPerWeek(userId: string): Promise<number> {
    const { data: completions } = await this.supabase
      .from('action_completions')
      .select('date')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString())

    if (!completions || completions.length === 0) return 0

    const uniqueDays = new Set(completions.map(c => c.date.split('T')[0])).size
    return uniqueDays / 4 // 4 weeks
  }

  private async getAverageResponseTime(userId: string): Promise<number> {
    const { data: missions } = await this.supabase
      .from('daily_missions')
      .select('created_at, completed_at')
      .eq('user_id', userId)

    if (!missions || missions.length === 0) return 24

    const responseTimes = missions.map(m => {
      if (m.completed_at) {
        const created = new Date(m.created_at)
        const completed = new Date(m.completed_at)
        return (completed.getTime() - created.getTime()) / (1000 * 60 * 60)
      }
      return 24
    })

    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
  }

  private async getConsecutiveSuccessfulDays(userId: string): Promise<number> {
    try {
      const { data: completions } = await this.supabase
        .from('action_completions')
        .select('date')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('date', { ascending: false })

      if (!completions || completions.length === 0) return 0

      let consecutiveDays = 1
      const dates = completions.map(c => c.date.split('T')[0]).sort().reverse()
      
      for (let i = 0; i < dates.length - 1; i++) {
        const current = new Date(dates[i])
        const previous = new Date(dates[i + 1])
        const diffDays = (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)
        
        if (diffDays <= 1) {
          consecutiveDays++
        } else {
          break
        }
      }

      return consecutiveDays
    } catch (error) {
      return 0
    }
  }

  private async getProgressRate(userId: string, goalId: string): Promise<number> {
    try {
      const { data: completions } = await this.supabase
        .from('action_completions')
        .select('created_at')
        .eq('user_id', userId)
        .eq('goal_id', goalId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (!completions || completions.length === 0) return 30

      const monthlyCompletions = completions.length
      const expectedMonthly = 20
      return Math.min(100, (monthlyCompletions / expectedMonthly) * 100)
    } catch (error) {
      return 50
    }
  }

  private async getPastFailureRate(userId: string): Promise<number> {
    try {
      const { data: failedGoals } = await this.supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'abandoned')

      const { data: allGoals } = await this.supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)

      if (!allGoals || allGoals.length === 0) return 0
      return (failedGoals?.length || 0) / allGoals.length
    } catch (error) {
      return 0
    }
  }

  private getDefaultDetailedMetrics(): DetailedMetrics {
    return {
      days_active: 0,
      tasks_completed: 0,
      weekly_consistency: 0,
      goal_completion: 0,
      consecutive_successful_days: 0,
      current_streak: 0,
      weekly_improvement: 0,
      time_invested_hours: 0,
      goal_abandonment_rate: 0,
      average_active_days_per_week: 0,
      average_response_time_hours: 24
    }
  }
}

// Singleton instance
export const metricsCalculator = new MetricsCalculator()

// Convenience functions
export const getCoreMetrics = (userId: string) => metricsCalculator.getAllCoreMetrics(userId)
export const getDetailedMetrics = (userId: string) => metricsCalculator.getDetailedMetrics(userId)
