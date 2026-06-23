import { followUpQuestionService, FollowUpQuestion, FollowUpQuestionService } from '../ai/follow-up-questions'
import { NVIDIANIMService } from '../ai/nvidia-nim'
import { DatabaseService } from '../supabase/database'

export interface CognitiveLoadAssessment {
  id: string
  user_id: string
  assessment_date: string
  status: 'normal' | 'elevated' | 'overloaded'
  score: number
  responses: Array<{
    question_id: string
    question_text: string
    answer: string
    weight: number
  }>
  lock_until: string | null
  lock_reason: string | null
  suggested_break_duration: number
  break_activities: string[]
}

export interface CognitiveLock {
  user_id: string
  locked_at: string
  lock_until: string
  lock_reason: string
  severity: 'mild' | 'moderate' | 'severe'
  break_suggestions: string[]
  chat_access_only: boolean
  assessment_required: boolean
}

export interface CognitiveRecoveryAssessment {
  user_id: string
  assessment_date: string
  ready_to_engage: boolean
  current_score: number
  improvement_from_lock: number
  recommendations: string[]
}

export class CognitiveLoadSystem {
  private nvidiaService: NVIDIANIMService
  private baseLockDurationHours = 6
  private followUpService: FollowUpQuestionService
  private db: DatabaseService

  constructor() {
    this.nvidiaService = new NVIDIANIMService()
    this.followUpService = followUpQuestionService
    this.db = new DatabaseService()
  }

  async initiateCognitiveLoadAssessment(userId: string, triggerReason: string): Promise<{
    questions: FollowUpQuestion[]
    assessment_id: string
  }> {
    // Generate cognitive load questions
    const questions = await this.followUpService.generateCognitiveLoadQuestions()

    return {
      questions,
      assessment_id: `assessment_${Date.now()}`,
    }
  }

  async processAssessmentResponses(
    userId: string,
    assessmentId: string,
    responses: Array<{ question_id: string; answer: string }>
  ): Promise<CognitiveLoadAssessment> {
    // Calculate cognitive load score
    const score = this.followUpService.calculateCognitiveLoadScore(responses)
    const status = this.followUpService.determineCognitiveLoadStatus(score)

    // Determine if lock is needed
    let lockUntil: string | null = null
    let lockReason: string | null = null
    let suggestedBreakDuration = 0
    let breakActivities: string[] = []

    if (status === 'overloaded') {
      const lockResult = this.calculateLockDuration(score, status)
      lockUntil = lockResult.lockUntil
      lockReason = lockResult.reason
      suggestedBreakDuration = lockResult.breakDuration
      breakActivities = await this.generateBreakActivities(score, status)
    } else if (status === 'elevated') {
      suggestedBreakDuration = 15 // 15 minutes for elevated
      breakActivities = await this.generateBreakActivities(score, status)
    }

    const assessment: CognitiveLoadAssessment = {
      id: assessmentId,
      user_id: userId,
      assessment_date: new Date().toISOString(),
      status,
      score,
      responses: responses.map(r => ({
        question_id: r.question_id,
        question_text: '',
        answer: r.answer,
        weight: this.getQuestionWeight(r.question_id),
      })),
      lock_until: lockUntil,
      lock_reason: lockReason,
      suggested_break_duration: suggestedBreakDuration,
      break_activities: breakActivities,
    }

    // Save to database
    await this.db.createCognitiveAssessment({
      user_id: userId,
      assessment_date: assessment.assessment_date,
      status: assessment.status,
      score: assessment.score,
      responses: assessment.responses,
      lock_until: assessment.lock_until,
      lock_reason: assessment.lock_reason,
      suggested_break_duration: assessment.suggested_break_duration,
      break_activities: assessment.break_activities,
    })

    return assessment
  }

  private calculateLockDuration(score: number, status: string): {
    lockUntil: string
    reason: string
    breakDuration: number
  } {
    const now = new Date()
    let durationHours = this.baseLockDurationHours
    let reason = 'Cognitive overload detected'

    // Adjust duration based on severity
    if (score >= 85) {
      durationHours = 12 // Severe overload
      reason = 'Severe cognitive overload detected. Extended break required for recovery.'
    } else if (score >= 70) {
      durationHours = 8 // High overload
      reason = 'High cognitive load detected. Significant break recommended.'
    } else {
      durationHours = 6 // Moderate overload
      reason = 'Elevated cognitive load detected. Break needed for recovery.'
    }

    const lockUntil = new Date(now.getTime() + durationHours * 60 * 60 * 1000)

    return {
      lockUntil: lockUntil.toISOString(),
      reason,
      breakDuration: durationHours * 60, // Convert to minutes
    }
  }

  private async generateBreakActivities(
    score: number,
    status: string
  ): Promise<string[]> {
    const systemPrompt = `You are a mental health and productivity expert. Generate 3-5 appropriate break activities based on the user's cognitive load status.

Cognitive load score: ${score}/100
Status: ${status}

Guidelines:
- Activities should be restorative, not stimulating
- For high scores, suggest more passive activities
- Include a mix of physical and mental breaks
- Each activity should take 5-15 minutes
- Avoid activities that require decision-making

Return a JSON response with this structure:
{
  "activities": [
    "Activity 1 description",
    "Activity 2 description",
    ...
  ]
}`

    try {
      const response = await this.nvidiaService.makeRequest(
        'meta/llama-3.1-8b-instruct',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate appropriate break activities.' },
        ],
        0.7,
        512
      )

      const parsed = JSON.parse(response)
      return parsed.activities || this.getDefaultBreakActivities(status)
    } catch (error) {
      console.error('Failed to generate break activities:', error)
      return this.getDefaultBreakActivities(status)
    }
  }

  private getDefaultBreakActivities(status: string): string[] {
    if (status === 'overloaded') {
      return [
        'Take a 15-minute walk outside without your phone',
        'Practice deep breathing exercises for 5 minutes',
        'Listen to calming music without doing anything else',
        'Take a short nap (10-20 minutes)',
        'Sit in silence and focus on your breathing',
      ]
    } else {
      return [
        'Take a 5-minute walk around your space',
        'Stretch or do light physical movement',
        'Step away from screens and look at something distant',
        'Drink a glass of water slowly',
        'Take a few deep breaths',
      ]
    }
  }

  private getQuestionWeight(questionId: string): number {
    // Different questions have different weights in the overall score
    if (questionId.includes('cognitive_1')) return 0.25 // Focus difficulty
    if (questionId.includes('cognitive_2')) return 0.2 // Mental clutter
    if (questionId.includes('cognitive_3')) return 0.25 // Emotional response
    if (questionId.includes('cognitive_4')) return 0.15 // Memory/attention
    if (questionId.includes('cognitive_5')) return 0.15 // Capacity test
    return 0.2 // Default weight
  }

  async applyCognitiveLock(
    userId: string,
    assessment: CognitiveLoadAssessment
  ): Promise<CognitiveLock> {
    if (!assessment.lock_until) {
      throw new Error('No lock duration specified in assessment')
    }

    const severity: 'mild' | 'moderate' | 'severe' =
      assessment.score >= 85 ? 'severe' : assessment.score >= 70 ? 'moderate' : 'mild'

    const lock: CognitiveLock = {
      user_id: userId,
      locked_at: new Date().toISOString(),
      lock_until: assessment.lock_until,
      lock_reason: assessment.lock_reason || 'Cognitive load assessment',
      severity,
      break_suggestions: assessment.break_activities,
      chat_access_only: true, // Only allow chat during lock
      assessment_required: true, // Require assessment before unlocking
    }

    // Save cognitive lock to database
    await this.db.createCognitiveLock({
      user_id: userId,
      locked_at: lock.locked_at,
      lock_until: lock.lock_until,
      lock_reason: lock.lock_reason,
      severity: lock.severity,
      break_suggestions: lock.break_suggestions,
      chat_access_only: lock.chat_access_only,
      assessment_required: lock.assessment_required,
    })

    return lock
  }

  async checkCognitiveLockStatus(userId: string): Promise<{
    is_locked: boolean
    lock?: CognitiveLock
    time_remaining?: number
  }> {
    const lockData = await this.db.getActiveCognitiveLock(userId)
    
    if (!lockData) {
      return {
        is_locked: false,
      }
    }

    const lock: CognitiveLock = {
      user_id: lockData.user_id,
      locked_at: lockData.locked_at,
      lock_until: lockData.lock_until,
      lock_reason: lockData.lock_reason,
      severity: lockData.severity,
      break_suggestions: lockData.break_suggestions,
      chat_access_only: lockData.chat_access_only,
      assessment_required: lockData.assessment_required,
    }

    const timeRemaining = new Date(lockData.lock_until).getTime() - Date.now()

    return {
      is_locked: true,
      lock,
      time_remaining: Math.max(0, timeRemaining),
    }
  }

  async initiateRecoveryAssessment(userId: string): Promise<{
    questions: FollowUpQuestion[]
    assessment_id: string
  }> {
    // Generate simplified recovery questions
    const questions: FollowUpQuestion[] = [
      {
        id: 'recovery_1',
        question_type: 'assessment',
        question_text: 'How rested do you feel right now?',
        answer_options: ['Very rested', 'Somewhat rested', 'Not very rested', 'Not rested at all'],
        correct_answer: undefined,
        is_answered: false,
        context: 'Assessing current rest level',
        priority: 5,
      },
      {
        id: 'recovery_2',
        question_type: 'assessment',
        question_text: 'How clear is your thinking right now?',
        answer_options: ['Very clear', 'Somewhat clear', 'Somewhat foggy', 'Very foggy'],
        correct_answer: undefined,
        is_answered: false,
        context: 'Assessing mental clarity',
        priority: 5,
      },
      {
        id: 'recovery_3',
        question_type: 'assessment',
        question_text: 'Do you feel ready to engage with your goals again?',
        answer_options: ['Yes, definitely', 'Yes, somewhat', 'Not really', 'Not at all'],
        correct_answer: undefined,
        is_answered: false,
        context: 'Assessing readiness to re-engage',
        priority: 5,
      },
    ]

    return {
      questions,
      assessment_id: `recovery_${Date.now()}`,
    }
  }

  async processRecoveryAssessment(
    userId: string,
    assessmentId: string,
    responses: Array<{ question_id: string; answer: string }>,
    previousScore: number
  ): Promise<CognitiveRecoveryAssessment> {
    // Calculate recovery score
    let currentScore = 0
    responses.forEach(response => {
      const answer = response.answer.toLowerCase()
      if (answer.includes('very') && (answer.includes('rested') || answer.includes('clear'))) {
        currentScore += 0
      } else if (answer.includes('somewhat') && (answer.includes('rested') || answer.includes('clear'))) {
        currentScore += 15
      } else if (answer.includes('not very') || answer.includes('somewhat foggy')) {
        currentScore += 30
      } else {
        currentScore += 50
      }
    })

    // Normalize score
    currentScore = Math.min(currentScore, 100)

    // Calculate improvement
    const improvement = previousScore - currentScore
    const readyToEngage = currentScore < 40 && improvement > 20

    // Generate recommendations
    const recommendations = await this.generateRecoveryRecommendations(currentScore, improvement)

    return {
      user_id: userId,
      assessment_date: new Date().toISOString(),
      ready_to_engage: readyToEngage,
      current_score: currentScore,
      improvement_from_lock: improvement,
      recommendations,
    }
  }

  private async generateRecoveryRecommendations(
    currentScore: number,
    improvement: number
  ): Promise<string[]> {
    const recommendations: string[] = []

    if (currentScore < 30) {
      recommendations.push('You appear well-rested and ready to re-engage')
      recommendations.push('Start with a simple task to build momentum')
    } else if (currentScore < 50) {
      recommendations.push('You\'re showing improvement but may benefit from a bit more rest')
      recommendations.push('Consider starting with lighter tasks')
    } else if (improvement > 30) {
      recommendations.push('You\'re making good progress toward recovery')
      recommendations.push('Continue with restorative activities')
    } else {
      recommendations.push('More recovery time may be beneficial')
      recommendations.push('Focus on self-care activities')
    }

    return recommendations
  }

  async liftCognitiveLock(userId: string, recoveryAssessment: CognitiveRecoveryAssessment): Promise<void> {
    if (!recoveryAssessment.ready_to_engage) {
      throw new Error('User not ready to engage. Lock cannot be lifted.')
    }

    // In production, this would update the database
    console.log('Lifting cognitive lock for user:', userId)
  }

  async extendCognitiveLock(
    userId: string,
    additionalHours: number,
    reason: string
  ): Promise<CognitiveLock> {
    // In production, this would update the existing lock in the database
    const now = new Date()
    const newLockUntil = new Date(now.getTime() + additionalHours * 60 * 60 * 1000)

    const extendedLock: CognitiveLock = {
      user_id: userId,
      locked_at: now.toISOString(),
      lock_until: newLockUntil.toISOString(),
      lock_reason: `Extended lock: ${reason}`,
      severity: 'moderate',
      break_suggestions: await this.getDefaultBreakActivities('overloaded'),
      chat_access_only: true,
      assessment_required: true,
    }

    console.log('Extending cognitive lock:', extendedLock)
    return extendedLock
  }

  async getCognitiveLoadTrends(userId: string, days: number = 30): Promise<{
    average_score: number
    trend: 'improving' | 'stable' | 'declining'
    peak_load_times: string[]
    common_triggers: string[]
  }> {
    // In production, this would analyze historical data
    // For now, return default values
    return {
      average_score: 45,
      trend: 'stable',
      peak_load_times: ['afternoon', 'evening'],
      common_triggers: ['work deadlines', 'task complexity'],
    }
  }

  async generateCognitiveLoadReport(userId: string): Promise<{
    current_status: string
    recent_assessments: number
    total_lock_time: number
    average_recovery_time: number
    recommendations: string[]
  }> {
    // In production, this would generate a comprehensive report
    return {
      current_status: 'normal',
      recent_assessments: 3,
      total_lock_time: 12, // hours
      average_recovery_time: 4, // hours
      recommendations: [
        'Your cognitive load patterns are within healthy ranges',
        'Consider taking regular breaks during peak work hours',
        'Your recovery time is excellent - keep up the good self-care',
      ],
    }
  }
}

export const cognitiveLoadSystem = new CognitiveLoadSystem()