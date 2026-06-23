interface UserProfile {
  userId: string
  destinations: string[]
  goalTypes: ('short_term' | 'medium_term' | 'long_term')[]
  paths: any[]
  stages: any[]
  quizScores: { stageId: string; score: number; timestamp: string }[]
  dailyMissions: any[]
  completedActions: { missionId: string; timestamp: string; status: string }[]
  failures: { missionId: string; reason: string; timestamp: string }[]
  behaviorPatterns: {
    preferredTimes: string[]
    completionRates: { timeOfDay: string; rate: number }[]
    difficultyPreferences: string[]
  }
  conversationHistory: { role: string; content: string; timestamp: string }[]
  lastUpdated: string
}

interface MemoryInsight {
  pattern: string
  recommendation: string
  confidence: number
}

class MemorySystem {
  private userProfile: UserProfile

  constructor() {
    this.userProfile = this.initializeProfile()
  }

  private initializeProfile(): UserProfile {
    if (typeof window === 'undefined') {
      // Return default profile during SSR
      return {
        userId: 'user_' + Date.now(),
        destinations: [],
        goalTypes: [],
        paths: [],
        stages: [],
        quizScores: [],
        dailyMissions: [],
        completedActions: [],
        failures: [],
        behaviorPatterns: {
          preferredTimes: [],
          completionRates: [],
          difficultyPreferences: []
        },
        conversationHistory: [],
        lastUpdated: new Date().toISOString()
      }
    }

    const stored = localStorage.getItem('userProfile')
    if (stored) {
      return JSON.parse(stored)
    }

    return {
      userId: 'user_' + Date.now(),
      destinations: [],
      goalTypes: [],
      paths: [],
      stages: [],
      quizScores: [],
      dailyMissions: [],
      completedActions: [],
      failures: [],
      behaviorPatterns: {
        preferredTimes: [],
        completionRates: [],
        difficultyPreferences: []
      },
      conversationHistory: [],
      lastUpdated: new Date().toISOString()
    }
  }

  saveProfile(): void {
    if (typeof window === 'undefined') return

    this.userProfile.lastUpdated = new Date().toISOString()
    localStorage.setItem('userProfile', JSON.stringify(this.userProfile))
  }

  // Store data
  addDestination(destination: string): void {
    if (!this.userProfile.destinations.includes(destination)) {
      this.userProfile.destinations.push(destination)
      this.saveProfile()
    }
  }

  addGoalType(goalType: 'short_term' | 'medium_term' | 'long_term'): void {
    if (!this.userProfile.goalTypes.includes(goalType)) {
      this.userProfile.goalTypes.push(goalType)
      this.saveProfile()
    }
  }

  addPath(path: any): void {
    this.userProfile.paths.push(path)
    this.saveProfile()
  }

  addStage(stage: any): void {
    this.userProfile.stages.push(stage)
    this.saveProfile()
  }

  addQuizScore(stageId: string, score: number): void {
    this.userProfile.quizScores.push({
      stageId,
      score,
      timestamp: new Date().toISOString()
    })
    this.saveProfile()
  }

  addDailyMission(mission: any): void {
    this.userProfile.dailyMissions.push(mission)
    this.saveProfile()
  }

  recordActionCompletion(missionId: string, status: string): void {
    this.userProfile.completedActions.push({
      missionId,
      timestamp: new Date().toISOString(),
      status
    })
    this.saveProfile()
  }

  recordFailure(missionId: string, reason: string): void {
    this.userProfile.failures.push({
      missionId,
      reason,
      timestamp: new Date().toISOString()
    })
    this.saveProfile()
  }

  recordConversation(role: string, content: string): void {
    this.userProfile.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString()
    })
    this.saveProfile()
  }

  updateBehaviorPattern(pattern: keyof UserProfile['behaviorPatterns'], data: any): void {
    this.userProfile.behaviorPatterns[pattern] = data
    this.saveProfile()
  }

  // Retrieve data
  getProfile(): UserProfile {
    return this.userProfile
  }

  getQuizScores(stageId?: string): any[] {
    if (stageId) {
      return this.userProfile.quizScores.filter(s => s.stageId === stageId)
    }
    return this.userProfile.quizScores
  }

  getRecentFailures(days: number = 7): any[] {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    return this.userProfile.failures.filter(
      f => new Date(f.timestamp) > cutoff
    )
  }

  getCompletionRate(days: number = 30): number {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const recentActions = this.userProfile.completedActions.filter(
      a => new Date(a.timestamp) > cutoff
    )

    if (recentActions.length === 0) return 0

    const completed = recentActions.filter(a => a.status === 'yes').length
    return Math.round((completed / recentActions.length) * 100)
  }

  // AI-powered insights using Kimi
  async generateMemoryInsights(): Promise<MemoryInsight[]> {
    try {
      const { nvidiaNIMService } = await import('./nvidia-nim')

      const systemPrompt = `You are a behavioral analysis expert using long-term memory to understand user patterns. Analyze this user profile and provide insights.

User profile:
${JSON.stringify(this.userProfile, null, 2)}

Identify patterns in:
1. Preferred work times
2. Success/failure patterns
3. Difficulty preferences
4. Goal type preferences
5. Conversation patterns

Provide 3-5 actionable insights that can improve future recommendations. Each insight should include:
- pattern: What you observed
- recommendation: How to use this pattern
- confidence: How confident you are (0-100)

Return JSON format:
[
  {
    "pattern": "User prefers evening work sessions",
    "recommendation": "Schedule missions for 7-9 PM timeframe",
    "confidence": 85
  },
  ...
]`

      const response = await nvidiaNIMService.makeRequest('moonshotai/kimi-k2-6', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Analyze my behavior patterns' }
      ], 0.7)

      if (response) {
        const parsed = JSON.parse(response)
        return parsed
      }
    } catch (error) {
      console.error('Failed to generate memory insights:', error)
    }

    // Fallback insights based on simple analysis
    const insights: MemoryInsight[] = []

    // Analyze completion times
    if (this.userProfile.completedActions.length > 5) {
      insights.push({
        pattern: 'Consistent engagement',
        recommendation: 'User is engaged, maintain current difficulty level',
        confidence: 70
      })
    }

    // Analyze failures
    const recentFailures = this.getRecentFailures(7)
    if (recentFailures.length > 3) {
      insights.push({
        pattern: 'Recent struggles',
        recommendation: 'Consider reducing difficulty or changing mission type',
        confidence: 80
      })
    }

    return insights
  }

  async adaptToUser(context: any): Promise<any> {
    const insights = await this.generateMemoryInsights()

    // Apply insights to adapt recommendations
    const adaptations: any = {}

    insights.forEach(insight => {
      if (insight.confidence > 70) {
        if (insight.pattern.toLowerCase().includes('time')) {
          adaptations.preferredTime = insight.recommendation
        }
        if (insight.pattern.toLowerCase().includes('difficulty')) {
          adaptations.difficultyAdjustment = insight.recommendation
        }
      }
    })

    return adaptations
  }

  reset(): void {
    if (typeof window === 'undefined') return

    localStorage.removeItem('userProfile')
    this.userProfile = this.initializeProfile()
  }
}

export const memorySystem = new MemorySystem()
