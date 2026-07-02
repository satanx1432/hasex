const API_BASE = '/api/ai'

export interface AIServiceConfig {
  provider: 'nvidia' | 'groq'
  model: string
  temperature: number
  maxTokens: number
}

export class AIService {
  private async callAI(action: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'AI API error')
    }

    return response.json()
  }

  async chat(messages: any[], config?: Partial<AIServiceConfig>): Promise<{ message: string }> {
    return this.callAI('chat', { messages, ...config })
  }

  async chatWithFallback(messages: any[], config?: Partial<AIServiceConfig>): Promise<string> {
    const result = await this.chat(messages, config)
    return result.message
  }

  async generateInsight(prompt: string, context?: any): Promise<string> {
    const result = await this.callAI('generateInsight', { prompt, context })
    return result.insight
  }

  async getWhereToImprove(
    userStats: {
      completed: number
      rate: number
      streak: number
      total: number
      daysActive: number
    },
    recentTasks: Array<{
      title: string
      status: string
      completed_at?: string
    }>,
    categoryDistribution: Record<string, number>
  ): Promise<{
    insight: string
    suggestions: string[]
    priority: 'high' | 'medium' | 'low'
  }> {
    try {
      const prompt = `Based on the user's data:
Stats: ${JSON.stringify(userStats)}
Recent tasks: ${JSON.stringify(recentTasks.slice(-10))}
Category distribution: ${JSON.stringify(categoryDistribution)}

Provide a concise "where to improve" analysis (not "strengths/weaknesses"). Focus on:
1. The single most impactful area to focus on
2. 2-3 specific, actionable suggestions
3. Priority level (high/medium/low)

Be direct and factual. No fluff. Return as JSON with keys: insight, suggestions (array), priority.`

      const result = await this.callAI('generateInsight', { prompt })
      return {
        insight: result.insight,
        suggestions: [
          'Focus on consistency over intensity',
          'Build habits before increasing difficulty',
          'Track your energy patterns to optimize timing'
        ],
        priority: userStats.streak < 3 ? 'high' : userStats.rate < 50 ? 'medium' : 'low'
      }
    } catch (error) {
      console.error('AI insight failed:', error)
      return {
        insight: 'Complete more tasks consistently to improve your ranking.',
        suggestions: [
          'Focus on completing daily tasks',
          'Build a streak of 3+ days',
          'Review your task completion patterns'
        ],
        priority: 'medium'
      }
    }
  }

  async analyzePatterns(
    taskHistory: Array<{
      title: string
      status: string
      category?: string
      completed_at?: string
      difficulty_score?: number
    }>
  ): Promise<string> {
    try {
      const result = await this.callAI('generateInsight', {
        prompt: `Analyze these task patterns and provide one key insight:
${JSON.stringify(taskHistory)}

Be direct. Focus on patterns that could help improve performance.`
      })
      return result.insight
    } catch (error) {
      return 'Keep tracking your progress to reveal patterns over time.'
    }
  }

  async generateActionOptions(goal: string, userHistory?: any, context?: any): Promise<any> {
    return this.callAI('generateAction', { prompt: `Goal: "${goal}"\nUser History: ${JSON.stringify(userHistory || {})}\nContext: ${JSON.stringify(context || {})}` })
  }

  async interviewUser(goal: string): Promise<string> {
    const result = await this.callAI('interview', {
      prompt: `The user's goal is: "${goal}". Start the interview with the most critical question.`
    })
    return result.message
  }

  async generateRoadmap(goal: string, context: any): Promise<any> {
    return this.callAI('roadmap', { prompt: `Goal: "${goal}"\nContext: ${JSON.stringify(context)}\nGenerate a detailed roadmap.` })
  }
}

export const aiService = new AIService()

export async function getAIService() {
  return aiService
}

export async function checkAIStatus(): Promise<{ nvidia: boolean; groq: boolean }> {
  const response = await fetch(`${API_BASE}`)
  return response.json()
}