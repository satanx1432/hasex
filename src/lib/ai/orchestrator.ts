/**
 * AI Orchestration Layer
 * 
 * Routes to the best model automatically based on goal type
 * User never knows which model is being used
 */

import { createClient } from '../supabase/client'

interface OrchestratorInput {
  goal: string
  timeCommitment: string
  resources: string
}

interface OrchestratedResult {
  dailyAction: string
  estimatedTime: string
  whyItMatters: string
  goalCategory: string
  modelUsed: string
}

class AIOrchestrator {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  /**
   * Main orchestration method
   */
  async orchestrate(input: OrchestratorInput): Promise<OrchestratedResult> {
    const { goal, timeCommitment, resources } = input

    // Determine goal category
    const goalCategory = this.classifyGoal(goal)

    // Route to appropriate model
    const model = this.selectModel(goal, goalCategory)

    // Generate today's action using the selected model
    const action = await this.generateAction(goal, timeCommitment, resources, model, goalCategory)

    return {
      dailyAction: action.action,
      estimatedTime: action.estimatedTime,
      whyItMatters: action.whyItMatters,
      goalCategory,
      modelUsed: model
    }
  }

  /**
   * Classify goal into category
   */
  private classifyGoal(goal: string): string {
    const goalLower = goal.toLowerCase()

    // Academic goals
    if (goalLower.includes('iit') || goalLower.includes('gate') || goalLower.includes('exam') || goalLower.includes('study') || goalLower.includes('learn') || goalLower.includes('course') || goalLower.includes('degree')) {
      return 'academic'
    }

    // Startup/business goals
    if (goalLower.includes('startup') || goalLower.includes('business') || goalLower.includes('company') || goalLower.includes('entrepreneur') || goalLower.includes('make money') || goalLower.includes('revenue')) {
      return 'business'
    }

    // Health/fitness goals
    if (goalLower.includes('weight') || goalLower.includes('fit') || goalLower.includes('gym') || goalLower.includes('health') || goalLower.includes('exercise') || goalLower.includes('diet')) {
      return 'health'
    }

    // Skill development
    if (goalLower.includes('skill') || goalLower.includes('become') || goalLower.includes('get good at') || goalLower.includes('master') || goalLower.includes('improve')) {
      return 'skill'
    }

    // Habits/discipline
    if (goalLower.includes('discipline') || goalLower.includes('habit') || goalLower.includes('routine') || goalLower.includes('consistent')) {
      return 'habit'
    }

    return 'general'
  }

  /**
   * Select the best model for the goal
   */
  private selectModel(goal: string, category: string): string {
    // Academic goals → Qwen3.5-397B (planning, structured reasoning)
    if (category === 'academic') {
      return 'QWEN_3_5_397B'
    }

    // Startup/business goals → Kimi K2.6 (deep reasoning, research, complex analysis)
    if (category === 'business') {
      return 'KIMI_K2_6'
    }

    // General goals → Nemotron 550B (coaching, conversation)
    if (category === 'general') {
      return 'NEMOTRON_550B'
    }

    // Health/fitness → Qwen3.5-397B (structured planning)
    if (category === 'health') {
      return 'QWEN_3_5_397B'
    }

    // Skill development → Qwen3.5-397B (long-term decomposition)
    if (category === 'skill') {
      return 'QWEN_3_5_397B'
    }

    // Habit formation → Nemotron 550B (coaching, conversation)
    if (category === 'habit') {
      return 'NEMOTRON_550B'
    }

    // Default to Qwen3.5-397B
    return 'QWEN_3_5_397B'
  }

  /**
   * Generate today's action using the selected model
   */
  private async generateAction(goal: string, timeCommitment: string, resources: string, model: string, category: string): Promise<{
    action: string
    estimatedTime: string
    whyItMatters: string
  }> {
    try {
      const { nvidiaNIMService } = await import('./nvidia-nim')
      
      const modelName = this.getModelName(model)
      
      const systemPrompt = this.buildSystemPrompt(category, timeCommitment, resources)
      const userPrompt = `Goal: "${goal}"`

      const response = await nvidiaNIMService.makeRequest(modelName, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.7)

      if (!response) {
        return this.getFallbackAction(goal, category, timeCommitment)
      }

      return this.parseActionResponse(response, category, timeCommitment, goal)
    } catch (error) {
      console.error('Error generating action:', error)
      return this.getFallbackAction(goal, category, timeCommitment)
    }
  }

  /**
   * Build system prompt based on category and user constraints
   */
  private buildSystemPrompt(category: string, timeCommitment: string, resources: string): string {
    const basePrompt = `You are an execution expert. Your job is to tell the user exactly what to do today.

Context:
- Goal category: ${category}
- Time available: ${timeCommitment}
- Resources available: ${resources}

Your task:
1. Generate ONE specific action for today
2. Estimate how long it will take
3. Explain why this action matters

Rules:
- Action must be doable within the time commitment
- Action must use available resources
- Action must move the goal forward
- No vague advice
- No multi-step tasks
- Just ONE action

Return JSON format:
{
  "action": "Specific action to do today",
  "estimatedTime": "Time needed (e.g., '15 min', '30 min', '1 hour')",
  "whyItMatters": "Why this specific action matters for the goal"
}

Category-specific guidance:
- Academic: Focus on study, practice, problem-solving
- Business: Focus on customer discovery, product building, validation
- Health: Focus on exercise, nutrition, recovery
- Skill: Focus on practice, application, feedback
- Habit: Focus on small, consistent actions
- General: Focus on forward momentum

Keep responses concise and actionable.`

    return basePrompt
  }

  /**
   * Map model name to NVIDIA NIM model
   */
  private getModelName(model: string): string {
    switch (model) {
      case 'QWEN_3_5_397B':
        return 'qwen/qwen3.5-397b-a17b'
      case 'KIMI_K2_6':
        return 'moonshotai/kimi-k2-6'
      case 'NEMOTRON_550B':
        return 'nvidia/llama-3.1-nemotron-70b-instruct'
      default:
        return 'qwen/qwen3.5-397b-a17b'
    }
  }

  /**
   * Parse AI response
   */
  private parseActionResponse(response: string, category: string, timeCommitment: string, goal: string): {
    action: string
    estimatedTime: string
    whyItMatters: string
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        action: parsed.action || 'Take one small step forward',
        estimatedTime: parsed.estimatedTime || this.estimateTimeFromCommitment(timeCommitment),
        whyItMatters: parsed.whyItMatters || 'Builds momentum toward your goal'
      }
    } catch (error) {
      console.error('Error parsing response:', error)
      return this.getFallbackAction(goal, category, timeCommitment)
    }
  }

  /**
   * Fallback action generation
   */
  private getFallbackAction(goal: string, category: string, timeCommitment: string): {
    action: string
    estimatedTime: string
    whyItMatters: string
  } {
    const fallbackActions = {
      academic: `Spend ${this.estimateTimeFromCommitment(timeCommitment)} studying ${goal}`,
      business: `Spend ${this.estimateTimeFromCommitment(timeCommitment)} working on ${goal}`,
      health: `Exercise for ${this.estimateTimeFromCommitment(timeCommitment)} today`,
      skill: `Practice ${goal} for ${this.estimateTimeFromCommitment(timeCommitment)} today`,
      habit: `Do your ${goal} habit for ${this.estimateTimeFromCommitment(timeCommitment)} today`,
      general: `Take one step toward ${goal} for ${this.estimateTimeFromCommitment(timeCommitment)} today`
    }

    return {
      action: fallbackActions[category as keyof typeof fallbackActions] || fallbackActions.general,
      estimatedTime: this.estimateTimeFromCommitment(timeCommitment),
      whyItMatters: 'Builds momentum toward your goal'
    }
  }

  /**
   * Estimate time from commitment
   */
  private estimateTimeFromCommitment(commitment: string): string {
    if (commitment.includes('15 min')) return '15 min'
    if (commitment.includes('30 min')) return '30 min'
    if (commitment.includes('1 hour')) return '1 hour'
    if (commitment.includes('2 hour')) return '2 hours'
    return '30 min' // Default
  }

  /**
   * Store orchestration result in database
   */
  async storeResult(userId: string, result: OrchestratedResult, input: OrchestratorInput): Promise<void> {
    try {
      const { data: userData } = await this.supabase.auth.getUser()

      // Store goal
      await this.supabase.from('goals').insert({
        user_id: userData.user.id,
        title: input.goal,
        description: `Time commitment: ${input.timeCommitment}, Resources: ${input.resources}`,
        status: 'active',
        metadata: {
          category: result.goalCategory,
          model_used: result.modelUsed,
          time_commitment: input.timeCommitment,
          resources: input.resources
        }
      })

      // Store today's action
      await this.supabase.from('daily_missions').insert({
        user_id: userData.user.id,
        title: result.dailyAction,
        description: result.whyItMatters,
        estimated_time: result.estimatedTime,
        status: 'pending',
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error storing orchestration result:', error)
      // Don't throw - user can still proceed
    }
  }
}

export const aiOrchestrator = new AIOrchestrator()
