import { NVIDIANIMService } from '../ai/nvidia-nim'

export interface Goal {
  id: string
  title: string
  description: string
  status: 'active' | 'completed' | 'paused'
  priority_score: number
  progress: number
  last_activity: string
  created_at: string
  target_completion_date: string | null
}

export interface GoalPriority {
  goal_id: string
  goal_title: string
  priority_score: number
  priority_reason: string
  suggested_focus: 'high' | 'medium' | 'low'
  time_allocation_percentage: number
  dependencies: string[]
}

export interface MultiGoalDashboardData {
  user_id: string
  goals: Goal[]
  prioritized_goals: GoalPriority[]
  overall_progress: number
  time_allocation: Record<string, number>
  ai_insights: string[]
  suggested_schedule: ScheduleSuggestion[]
  conflicts_detected: Conflict[]
}

export interface ScheduleSuggestion {
  day_of_week: string
  goals: Array<{
    goal_id: string
    goal_title: string
    allocated_minutes: number
    suggested_time: string
  }>
  total_minutes: number
}

export interface Conflict {
  type: 'time' | 'resource' | 'energy'
  description: string
  affected_goals: string[]
  severity: 'low' | 'medium' | 'high'
  suggested_resolution: string
}

export class MultiGoalDashboard {
  private nvidiaService: NVIDIANIMService

  constructor() {
    this.nvidiaService = new NVIDIANIMService()
  }

  async generateDashboardData(
    userId: string,
    goals: Goal[],
    userPreferences: {
      available_hours_per_day: number
      preferred_days: string[]
      peak_energy_times: string[]
      current_focus: string | null
    }
  ): Promise<MultiGoalDashboardData> {
    // Prioritize goals using AI
    const prioritizedGoals = await this.prioritizeGoals(goals, userPreferences)

    // Calculate overall progress
    const overallProgress = this.calculateOverallProgress(goals)

    // Generate time allocation
    const timeAllocation = this.calculateTimeAllocation(prioritizedGoals, userPreferences)

    // Generate AI insights
    const aiInsights = await this.generateAIInsights(goals, prioritizedGoals, userPreferences)

    // Generate schedule suggestions
    const scheduleSuggestions = await this.generateScheduleSuggestions(
      prioritizedGoals,
      userPreferences
    )

    // Detect conflicts
    const conflicts = await this.detectConflicts(goals, scheduleSuggestions, userPreferences)

    return {
      user_id: userId,
      goals,
      prioritized_goals: prioritizedGoals,
      overall_progress: overallProgress,
      time_allocation: timeAllocation,
      ai_insights: aiInsights,
      suggested_schedule: scheduleSuggestions,
      conflicts_detected: conflicts,
    }
  }

  private async prioritizeGoals(
    goals: Goal[],
    userPreferences: any
  ): Promise<GoalPriority[]> {
    const systemPrompt = `You are a strategic goal prioritization expert. Analyze the user's goals and prioritize them based on multiple factors.

Consider:
- Progress toward completion
- Time sensitivity (deadlines)
- Resource requirements
- Dependencies between goals
- User's current focus
- Strategic importance
- Momentum and recent activity

Return a JSON response with this structure:
{
  "priorities": [
    {
      "goal_id": "goal_id",
      "goal_title": "Goal title",
      "priority_score": 1-100,
      "priority_reason": "Why this priority score",
      "suggested_focus": "high|medium|low",
      "time_allocation_percentage": 0-100,
      "dependencies": ["goal_id1", "goal_id2"]
    }
  ]
}`

    const userPrompt = this.buildPrioritizationPrompt(goals, userPreferences)

    try {
      const response = await this.nvidiaService.makeRequest(
        'meta/llama-3.1-8b-instruct',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        0.7,
        2048
      )

      const parsed = JSON.parse(response)
      return parsed.priorities.map((p: any) => ({
        ...p,
        dependencies: p.dependencies || [],
      }))
    } catch (error) {
      console.error('Failed to prioritize goals:', error)
      return this.getFallbackPrioritization(goals)
    }
  }

  private buildPrioritizationPrompt(goals: Goal[], userPreferences: any): string {
    let prompt = `User has ${goals.length} active goals:\n\n`

    goals.forEach((goal, i) => {
      prompt += `${i + 1}. ${goal.title}\n`
      prompt += `   Description: ${goal.description || 'Not provided'}\n`
      prompt += `   Progress: ${goal.progress}%\n`
      prompt += `   Status: ${goal.status}\n`
      prompt += `   Last activity: ${goal.last_activity}\n`
      if (goal.target_completion_date) {
        prompt += `   Target date: ${goal.target_completion_date}\n`
      }
      prompt += '\n'
    })

    prompt += `User preferences:\n`
    prompt += `- Available hours per day: ${userPreferences.available_hours_per_day}\n`
    prompt += `- Preferred days: ${userPreferences.preferred_days.join(', ')}\n`
    prompt += `- Peak energy times: ${userPreferences.peak_energy_times.join(', ')}\n`
    if (userPreferences.current_focus) {
      prompt += `- Current focus: ${userPreferences.current_focus}\n`
    }

    prompt += '\nPrioritize these goals and suggest time allocation percentages.'

    return prompt
  }

  private getFallbackPrioritization(goals: Goal[]): GoalPriority[] {
    return goals.map((goal, index) => ({
      goal_id: goal.id,
      goal_title: goal.title,
      priority_score: Math.max(10, 100 - index * 15),
      priority_reason: 'Based on order and progress',
      suggested_focus: index === 0 ? 'high' : index < 3 ? 'medium' : 'low',
      time_allocation_percentage: Math.max(5, 40 - index * 10),
      dependencies: [],
    }))
  }

  private calculateOverallProgress(goals: Goal[]): number {
    if (goals.length === 0) return 0
    const totalProgress = goals.reduce((sum, goal) => sum + goal.progress, 0)
    return totalProgress / goals.length
  }

  private calculateTimeAllocation(
    prioritizedGoals: GoalPriority[],
    userPreferences: any
  ): Record<string, number> {
    const allocation: Record<string, number> = {}
    const availableMinutes = userPreferences.available_hours_per_day * 60

    prioritizedGoals.forEach(priority => {
      const minutes = Math.floor(
        (priority.time_allocation_percentage / 100) * availableMinutes
      )
      allocation[priority.goal_id] = Math.max(15, minutes) // Minimum 15 minutes
    })

    return allocation
  }

  private async generateAIInsights(
    goals: Goal[],
    prioritizedGoals: GoalPriority[],
    userPreferences: any
  ): Promise<string[]> {
    const systemPrompt = `You are a goal achievement expert. Generate 3-5 insightful observations about the user's goal portfolio.

Focus on:
- Progress patterns
- Potential bottlenecks
- Opportunities for synergy
- Resource allocation recommendations
- Strategic advice

Return a JSON response with this structure:
{
  "insights": [
    "Insight 1",
    "Insight 2",
    ...
  ]
}`

    const userPrompt = this.buildInsightsPrompt(goals, prioritizedGoals, userPreferences)

    try {
      const response = await this.nvidiaService.makeRequest(
        'meta/llama-3.1-8b-instruct',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        0.7,
        1024
      )

      const parsed = JSON.parse(response)
      return parsed.insights || []
    } catch (error) {
      console.error('Failed to generate AI insights:', error)
      return this.getFallbackInsights(goals)
    }
  }

  private buildInsightsPrompt(
    goals: Goal[],
    prioritizedGoals: GoalPriority[],
    userPreferences: any
  ): string {
    let prompt = `Goals summary:\n`
    prompt += `- Total goals: ${goals.length}\n`
    prompt += `- Overall progress: ${this.calculateOverallProgress(goals)}%\n`
    prompt += `- High priority goals: ${prioritizedGoals.filter(g => g.suggested_focus === 'high').length}\n\n`

    prompt += `Top priorities:\n`
    prioritizedGoals.slice(0, 3).forEach((priority, i) => {
      prompt += `${i + 1}. ${priority.goal_title} (${priority.priority_score}/100)\n`
    })

    return prompt
  }

  private getFallbackInsights(goals: Goal[]): string[] {
    const insights: string[] = []

    if (goals.length > 3) {
      insights.push('You have multiple active goals. Consider focusing on 2-3 at a time for better progress.')
    }

    const avgProgress = this.calculateOverallProgress(goals)
    if (avgProgress < 30) {
      insights.push('Overall progress is in early stages. Focus on building momentum with quick wins.')
    } else if (avgProgress > 70) {
      insights.push('Strong progress across goals. Consider which goals to complete first.')
    }

    insights.push('Regular review of goal priorities helps maintain focus and alignment.')

    return insights
  }

  private async generateScheduleSuggestions(
    prioritizedGoals: GoalPriority[],
    userPreferences: any
  ): Promise<ScheduleSuggestion[]> {
    const suggestions: ScheduleSuggestion[] = []
    const days = userPreferences.preferred_days

    days.forEach((day: string) => {
      const dayGoals: ScheduleSuggestion['goals'] = []
      let totalMinutes = 0

      prioritizedGoals.forEach(priority => {
        if (priority.suggested_focus === 'high' || priority.suggested_focus === 'medium') {
          const allocationMinutes = Math.floor(
            (priority.time_allocation_percentage / 100) *
            userPreferences.available_hours_per_day *
            60
          )

          if (allocationMinutes > 0) {
            dayGoals.push({
              goal_id: priority.goal_id,
              goal_title: priority.goal_title,
              allocated_minutes: allocationMinutes,
              suggested_time: this.suggestTimeSlot(
                userPreferences.peak_energy_times,
                dayGoals.length
              ),
            })
            totalMinutes += allocationMinutes
          }
        }
      })

      suggestions.push({
        day_of_week: day,
        goals: dayGoals,
        total_minutes: totalMinutes,
      })
    })

    return suggestions
  }

  private suggestTimeSlot(peakTimes: string[], slotIndex: number): string {
    if (peakTimes.length > 0) {
      return peakTimes[slotIndex % peakTimes.length]
    }
    const defaultTimes = ['morning', 'afternoon', 'evening']
    return defaultTimes[slotIndex % defaultTimes.length]
  }

  private async detectConflicts(
    goals: Goal[],
    scheduleSuggestions: ScheduleSuggestion[],
    userPreferences: any
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = []

    // Check for time conflicts
    const totalDailyMinutes = userPreferences.available_hours_per_day * 60
    scheduleSuggestions.forEach(schedule => {
      if (schedule.total_minutes > totalDailyMinutes) {
        conflicts.push({
          type: 'time',
          description: `Scheduled time exceeds available time on ${schedule.day_of_week}`,
          affected_goals: schedule.goals.map(g => g.goal_id),
          severity: 'high',
          suggested_resolution: 'Reduce time allocation or decrease number of active goals',
        })
      }
    })

    // Check for goal priority conflicts
    const highPriorityCount = goals.filter(g => g.status === 'active').length
    if (highPriorityCount > 3) {
      conflicts.push({
        type: 'resource',
        description: 'Too many high-priority goals may dilute focus',
        affected_goals: goals.map(g => g.id),
        severity: 'medium',
        suggested_resolution: 'Consider pausing lower-priority goals or reducing active goals to 2-3',
      })
    }

    // Check for energy conflicts
    if (userPreferences.peak_energy_times.length < 2) {
      conflicts.push({
        type: 'energy',
        description: 'Limited peak energy time slots identified',
        affected_goals: goals.map(g => g.id),
        severity: 'low',
        suggested_resolution: 'Identify additional high-energy periods or schedule tasks accordingly',
      })
    }

    return conflicts
  }

  async adjustPrioritiesBasedOnProgress(
    currentPriorities: GoalPriority[],
    progressUpdates: Array<{ goal_id: string; progress_delta: number }>
  ): Promise<GoalPriority[]> {
    const adjustedPriorities = currentPriorities.map(priority => {
      const update = progressUpdates.find(u => u.goal_id === priority.goal_id)
      if (update) {
        // Adjust priority based on progress
        const adjustment = update.progress_delta > 0 ? 5 : -5
        return {
          ...priority,
          priority_score: Math.max(0, Math.min(100, priority.priority_score + adjustment)),
        }
      }
      return priority
    })

    // Re-sort by priority score
    return adjustedPriorities.sort((a, b) => b.priority_score - a.priority_score)
  }

  async suggestGoalCompletionOrder(prioritizedGoals: GoalPriority[]): Promise<string[]> {
    // Return goal IDs in suggested completion order
    return prioritizedGoals
      .sort((a, b) => b.priority_score - a.priority_score)
      .map(p => p.goal_id)
  }

  async generateGoalFocusRecommendation(
    userId: string,
    currentGoals: Goal[],
    userContext: any
  ): Promise<{
    recommended_focus: string
    reasoning: string
    alternative_focuses: string[]
  }> {
    const systemPrompt = `You are a goal strategy advisor. Recommend which goal the user should focus on primarily based on their current situation.

Consider:
- Current progress across goals
- Deadlines and time sensitivity
- Resource availability
- Energy levels and capacity
- Dependencies between goals
- Strategic importance

Return a JSON response with this structure:
{
  "recommended_focus": "goal_id",
  "reasoning": "Why this goal should be the focus",
  "alternative_focuses": ["goal_id1", "goal_id2"]
}`

    const userPrompt = `Current goals and context:\n${JSON.stringify(currentGoals)}\n\nUser context: ${JSON.stringify(userContext)}`

    try {
      const response = await this.nvidiaService.makeRequest(
        'meta/llama-3.1-8b-instruct',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        0.7,
        1024
      )

      const parsed = JSON.parse(response)
      return parsed
    } catch (error) {
      console.error('Failed to generate focus recommendation:', error)
      return {
        recommended_focus: currentGoals[0]?.id || '',
        reasoning: 'Based on goal order and priority',
        alternative_focuses: currentGoals.slice(1, 3).map(g => g.id),
      }
    }
  }
}

export const multiGoalDashboard = new MultiGoalDashboard()