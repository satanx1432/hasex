import { multiRoleAIService, AIContext, AIRole } from './multi-role-ai'
import { NVIDIANIMService } from './nvidia-nim'

export interface BehavioralPattern {
  id: string
  pattern_type: string
  pattern_data: any
  confidence_score: number
  last_detected: string
  intervention_triggered: boolean
}

export interface Intervention {
  id: string
  user_id: string
  intervention_type: 'motivational' | 'corrective' | 'preventive' | 'celebratory'
  trigger_pattern: string
  message: string
  ai_role: AIRole
  priority: number
  delivered: boolean
  delivered_at?: string
  user_response?: string
  effectiveness_score?: number
  created_at: string
}

export interface ProactiveCoachingConfig {
  enabled: boolean
  intervention_frequency: 'low' | 'medium' | 'high'
  quiet_hours: { start: string; end: string }
  minimum_confidence_threshold: number
  cooldown_period_hours: number
}

export class ProactiveCoachingService {
  private nvidiaService: NVIDIANIMService
  private defaultConfig: ProactiveCoachingConfig = {
    enabled: true,
    intervention_frequency: 'medium',
    quiet_hours: { start: '22:00', end: '08:00' },
    minimum_confidence_threshold: 0.7,
    cooldown_period_hours: 4,
  }

  constructor() {
    this.nvidiaService = new NVIDIANIMService()
  }

  async detectPatterns(userId: string, recentEvents: any[]): Promise<BehavioralPattern[]> {
    const patterns: BehavioralPattern[] = []

    // Pattern 1: Missed action streak
    const missedActionsPattern = this.detectMissedActionsPattern(recentEvents)
    if (missedActionsPattern) {
      patterns.push({
        id: `pattern_${Date.now()}_missed`,
        pattern_type: 'missed_actions_streak',
        pattern_data: missedActionsPattern,
        confidence_score: 0.85,
        last_detected: new Date().toISOString(),
        intervention_triggered: false,
      })
    }

    // Pattern 2: High success streak
    const successStreakPattern = this.detectSuccessStreakPattern(recentEvents)
    if (successStreakPattern) {
      patterns.push({
        id: `pattern_${Date.now()}_success`,
        pattern_type: 'success_streak',
        pattern_data: successStreakPattern,
        confidence_score: 0.9,
        last_detected: new Date().toISOString(),
        intervention_triggered: false,
      })
    }

    // Pattern 3: Time-based performance
    const timePattern = this.detectTimeBasedPattern(recentEvents)
    if (timePattern) {
      patterns.push({
        id: `pattern_${Date.now()}_time`,
        pattern_type: 'time_based_performance',
        pattern_data: timePattern,
        confidence_score: 0.75,
        last_detected: new Date().toISOString(),
        intervention_triggered: false,
      })
    }

    // Pattern 4: Difficulty avoidance
    const difficultyPattern = this.detectDifficultyPattern(recentEvents)
    if (difficultyPattern) {
      patterns.push({
        id: `pattern_${Date.now()}_difficulty`,
        pattern_type: 'difficulty_avoidance',
        pattern_data: difficultyPattern,
        confidence_score: 0.8,
        last_detected: new Date().toISOString(),
        intervention_triggered: false,
      })
    }

    // Pattern 5: Energy fluctuation
    const energyPattern = this.detectEnergyPattern(recentEvents)
    if (energyPattern) {
      patterns.push({
        id: `pattern_${Date.now()}_energy`,
        pattern_type: 'energy_fluctuation',
        pattern_data: energyPattern,
        confidence_score: 0.7,
        last_detected: new Date().toISOString(),
        intervention_triggered: false,
      })
    }

    return patterns.filter(p => p.confidence_score >= this.defaultConfig.minimum_confidence_threshold)
  }

  private detectMissedActionsPattern(events: any[]): any {
    const missedActions = events.filter(e => e.event_type === 'task_missed').slice(-5)
    if (missedActions.length >= 3) {
      return {
        missed_count: missedActions.length,
        timeframe: 'recent',
        average_gap_hours: this.calculateAverageGap(missedActions),
      }
    }
    return null
  }

  private detectSuccessStreakPattern(events: any[]): any {
    const completedActions = events.filter(e => e.event_type === 'task_completed').slice(-10)
    if (completedActions.length >= 5) {
      const consecutiveDays = this.calculateConsecutiveDays(completedActions)
      if (consecutiveDays >= 3) {
        return {
          streak_length: consecutiveDays,
          total_completed: completedActions.length,
          average_success_rate: 0.95,
        }
      }
    }
    return null
  }

  private detectTimeBasedPattern(events: any[]): any {
    const completedByTime = this.groupByTimeOfDay(events.filter(e => e.event_type === 'task_completed'))
    const bestTime = Object.entries(completedByTime).sort((a, b) => b[1].length - a[1].length)[0]
    
    if (bestTime && bestTime[1].length >= 3) {
      return {
        best_performance_time: bestTime[0],
        completion_rate: bestTime[1].length / events.filter(e => e.event_type === 'task_completed').length,
      }
    }
    return null
  }

  private detectDifficultyPattern(events: any[]): any {
    const skippedTasks = events.filter(e => e.event_type === 'task_skipped' && e.event_data?.difficulty_score)
    if (skippedTasks.length >= 2) {
      const avgDifficulty = skippedTasks.reduce((sum, e) => sum + e.event_data.difficulty_score, 0) / skippedTasks.length
      if (avgDifficulty > 6) {
        return {
          average_skipped_difficulty: avgDifficulty,
          count: skippedTasks.length,
          avoidance_detected: true,
        }
      }
    }
    return null
  }

  private detectEnergyPattern(events: any[]): any {
    const energyEvents = events.filter(e => e.event_data?.energy_level !== undefined)
    if (energyEvents.length >= 5) {
      const avgEnergy = energyEvents.reduce((sum, e) => sum + e.event_data.energy_level, 0) / energyEvents.length
      const variance = this.calculateVariance(energyEvents.map(e => e.event_data.energy_level))
      
      if (variance > 0.3) {
        return {
          average_energy: avgEnergy,
          energy_variance: variance,
          fluctuation_detected: true,
        }
      }
    }
    return null
  }

  private calculateAverageGap(events: any[]): number {
    if (events.length < 2) return 0
    const gaps = []
    for (let i = 1; i < events.length; i++) {
      const gap = new Date(events[i].created_at).getTime() - new Date(events[i-1].created_at).getTime()
      gaps.push(gap / (1000 * 60 * 60)) // Convert to hours
    }
    return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length
  }

  private calculateConsecutiveDays(events: any[]): number {
    if (events.length === 0) return 0
    const days = new Set(events.map(e => new Date(e.created_at).toDateString()))
    return days.size
  }

  private groupByTimeOfDay(events: any[]): Record<string, any[]> {
    return events.reduce((groups, event) => {
      const hour = new Date(event.created_at).getHours()
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
      if (!groups[timeOfDay]) groups[timeOfDay] = []
      groups[timeOfDay].push(event)
      return groups
    }, {} as Record<string, any[]>)
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }

  async generateIntervention(
    pattern: BehavioralPattern,
    userId: string,
    userContext: AIContext
  ): Promise<Intervention> {
    const interventionType = this.determineInterventionType(pattern)
    const aiRole = this.selectAIRoleForIntervention(pattern, interventionType)

    const systemPrompt = `You are a proactive behavioral coach. Generate a brief, personalized intervention message based on the detected pattern.

Pattern detected: ${pattern.pattern_type}
Pattern data: ${JSON.stringify(pattern.pattern_data)}
Confidence: ${pattern.confidence_score}

Intervention type: ${interventionType}
Role: ${aiRole}

Guidelines:
- Be brief and direct (2-3 sentences)
- Be supportive and non-judgmental
- Focus on actionable insights
- Avoid being preachy
- Personalize based on the pattern
- End with a specific question or call to action

Return a JSON response with this structure:
{
  "message": "Your intervention message",
  "priority": 1-10,
  "suggested_follow_up": "Optional follow-up question"
}`

    try {
      const response = await this.nvidiaService.makeRequest(
        'meta/llama-3.1-8b-instruct',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate an intervention for this pattern.` },
        ],
        0.7,
        512
      )

      const parsed = JSON.parse(response)

      return {
        id: `intervention_${Date.now()}`,
        user_id: userId,
        intervention_type: interventionType,
        trigger_pattern: pattern.pattern_type,
        message: parsed.message,
        ai_role: aiRole,
        priority: parsed.priority || 5,
        delivered: false,
        created_at: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Failed to generate intervention:', error)
      return this.getFallbackIntervention(pattern, userId, interventionType, aiRole)
    }
  }

  private determineInterventionType(pattern: BehavioralPattern): 'motivational' | 'corrective' | 'preventive' | 'celebratory' {
    switch (pattern.pattern_type) {
      case 'missed_actions_streak':
        return 'corrective'
      case 'success_streak':
        return 'celebratory'
      case 'difficulty_avoidance':
        return 'corrective'
      case 'energy_fluctuation':
        return 'preventive'
      case 'time_based_performance':
        return 'preventive'
      default:
        return 'motivational'
    }
  }

  private selectAIRoleForIntervention(pattern: BehavioralPattern, interventionType: string): AIRole {
    switch (interventionType) {
      case 'corrective':
        return 'coach'
      case 'celebratory':
        return 'motivator'
      case 'preventive':
        return 'advisor'
      case 'motivational':
        return 'motivator'
      default:
        return 'coach'
    }
  }

  private getFallbackIntervention(
    pattern: BehavioralPattern,
    userId: string,
    interventionType: string,
    aiRole: AIRole
  ): Intervention {
    const fallbackMessages: Record<string, string> = {
      corrective: "I noticed you've missed a few actions recently. Let's work together to get back on track.",
      celebratory: "Great job on your recent success! Keep up the excellent work.",
      preventive: "Based on your patterns, here's a suggestion to optimize your approach.",
      motivational: "You're making progress. Every step counts toward your goal.",
    }

    return {
      id: `intervention_${Date.now()}`,
      user_id: userId,
      intervention_type: interventionType as any,
      trigger_pattern: pattern.pattern_type,
      message: fallbackMessages[interventionType] || fallbackMessages.motivational,
      ai_role: aiRole,
      priority: 5,
      delivered: false,
      created_at: new Date().toISOString(),
    }
  }

  async shouldDeliverIntervention(
    intervention: Intervention,
    config: ProactiveCoachingConfig = this.defaultConfig
  ): Promise<boolean> {
    if (!config.enabled) return false

    // Check quiet hours
    const now = new Date()
    const currentTime = now.getHours()
    const quietStart = parseInt(config.quiet_hours.start.split(':')[0])
    const quietEnd = parseInt(config.quiet_hours.end.split(':')[0])

    if (currentTime >= quietStart || currentTime < quietEnd) {
      return false
    }

    // Check cooldown period (would need database query in production)
    // For now, we'll assume it's been long enough

    // Check priority against frequency setting
    const frequencyThresholds = {
      low: 8,
      medium: 5,
      high: 3,
    }

    return intervention.priority >= frequencyThresholds[config.intervention_frequency]
  }

  async recordInterventionResponse(
    interventionId: string,
    userResponse: string,
    effectiveness: number
  ): Promise<void> {
    // In production, this would update the database
    console.log(`Recording response for intervention ${interventionId}:`, {
      userResponse,
      effectiveness,
    })
  }

  async analyzeInterventionEffectiveness(
    interventions: Intervention[]
  ): Promise<Map<string, number>> {
    const effectivenessByPattern = new Map<string, number>()

    interventions.forEach(intervention => {
      if (intervention.effectiveness_score !== undefined) {
        const current = effectivenessByPattern.get(intervention.trigger_pattern) || 0
        effectivenessByPattern.set(
          intervention.trigger_pattern,
          (current + intervention.effectiveness_score) / 2
        )
      }
    })

    return effectivenessByPattern
  }

  getConfig(): ProactiveCoachingConfig {
    return this.defaultConfig
  }

  updateConfig(updates: Partial<ProactiveCoachingConfig>): ProactiveCoachingConfig {
    this.defaultConfig = { ...this.defaultConfig, ...updates }
    return this.defaultConfig
  }
}

export const proactiveCoachingService = new ProactiveCoachingService()