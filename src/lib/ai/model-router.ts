/**
 * Hybrid Model Router for AI Execution Coach
 * 
 * Routes requests to the best AI model (Qwen3.5-397B, Kimi K2.6, or Nemotron 550B)
 * based on task complexity, context length, and reasoning requirements.
 */

export type ModelType = 'QWEN_3_5_397B' | 'KIMI_K2_6' | 'NEMOTRON_550B'

export interface RoutingContext {
  task_type: 'new_goal' | 'roadmap' | 'milestones' | 'daily_actions' | 'structured_plans' | 'user_profiling' | 'deep_discussion' | 'complex_analysis' | 'strategic_planning' | 'difficult_reasoning'
  context_length: number
  conversation_history: Array<{ role: 'user' | 'assistant', content: string }>
  reasoning_complexity: 'low' | 'medium' | 'high'
  confidence_level: number
}

interface RoutingDecision {
  selected_model: ModelType
  reasoning: string
  confidence: number
}

export class ModelRouter {
  private readonly CONTEXT_THRESHOLD = 10
  private readonly COMPLEXITY_THRESHOLD = 0.7

  /**
   * Route to the best model based on task and context
   */
  route(context: RoutingContext): RoutingDecision {
    const routingFactors = this.analyzeRoutingFactors(context)
    const selectedModel = this.selectModel(routingFactors, context)
    const reasoning = this.generateReasoning(selectedModel, routingFactors)
    const confidence = this.calculateConfidence(routingFactors)

    return {
      selected_model: selectedModel,
      reasoning,
      confidence
    }
  }

  /**
   * Analyze factors that influence routing decision
   */
  private analyzeRoutingFactors(context: RoutingContext): {
    task_priority: ModelType
    context_priority: ModelType
    complexity_priority: ModelType
  } {
    let task_priority: ModelType = 'QWEN_3_5_397B'
    let context_priority: ModelType = 'QWEN_3_5_397B'
    let complexity_priority: ModelType = 'QWEN_3_5_397B'

    // Task-based routing
    if (this.isStructuredTask(context.task_type)) {
      task_priority = 'QWEN_3_5_397B'
    } else if (this.isConversationTask(context.task_type)) {
      task_priority = 'KIMI_K2_6'
    } else if (this.isComplexTask(context.task_type)) {
      task_priority = 'NEMOTRON_550B'
    }

    // Context-based routing
    if (context.context_length > this.CONTEXT_THRESHOLD) {
      context_priority = 'KIMI_K2_6'
    }

    // Complexity-based routing
    if (context.reasoning_complexity === 'high' && context.confidence_level < this.COMPLEXITY_THRESHOLD) {
      complexity_priority = 'NEMOTRON_550B'
    }

    return {
      task_priority,
      context_priority,
      complexity_priority
    }
  }

  /**
   * Select the best model based on routing factors
   */
  private selectModel(factors: ReturnType<ModelRouter['analyzeRoutingFactors']>, context: RoutingContext): ModelType {
    // Priority order: task > context > complexity
    if (factors.task_priority === 'QWEN_3_5_397B' && factors.context_priority === 'QWEN_3_5_397B' && factors.complexity_priority === 'QWEN_3_5_397B') {
      return 'QWEN_3_5_397B'
    }

    // If any factor requires Kimi, use Kimi
    if (factors.context_priority === 'KIMI_K2_6' || factors.task_priority === 'KIMI_K2_6') {
      return 'KIMI_K2_6'
    }

    // If any factor requires Nemotron, use Nemotron (highest priority)
    if (factors.complexity_priority === 'NEMOTRON_550B' || factors.task_priority === 'NEMOTRON_550B') {
      return 'NEMOTRON_550B'
    }

    // Default to Qwen3.5-397B for structured tasks
    return 'QWEN_3_5_397B'
  }

  /**
   * Generate reasoning for the routing decision
   */
  private generateReasoning(selectedModel: ModelType, factors: ReturnType<ModelRouter['analyzeRoutingFactors']>): string {
    const reasons: string[] = []

    switch (selectedModel) {
      case 'QWEN_3_5_397B':
        reasons.push('Qwen3.5-397B selected for structured output and reliable instruction following')
        if (factors.task_priority === 'QWEN_3_5_397B') reasons.push('Task requires goal analysis and planning')
        break
      case 'KIMI_K2_6':
        reasons.push('Kimi K2.6 selected for long context handling and conversational memory')
        if (factors.context_priority === 'KIMI_K2_6') reasons.push('Context exceeds threshold, needs large conversation history')
        if (factors.task_priority === 'KIMI_K2_6') reasons.push('Task requires deep discussion capabilities')
        break
      case 'NEMOTRON_550B':
        reasons.push('Nemotron 550B selected for deep reasoning and complex analysis')
        if (factors.complexity_priority === 'NEMOTRON_550B') reasons.push('High reasoning complexity requires advanced model')
        if (factors.task_priority === 'NEMOTRON_550B') reasons.push('Task requires strategic planning or difficult reasoning')
        break
    }

    return reasons.join('. ')
  }

  /**
   * Calculate confidence in routing decision
   */
  private calculateConfidence(factors: ReturnType<ModelRouter['analyzeRoutingFactors']>): number {
    // If all factors agree, high confidence
    if (factors.task_priority === factors.context_priority && factors.context_priority === factors.complexity_priority) {
      return 0.9
    }

    // If two factors agree, medium confidence
    if (factors.task_priority === factors.context_priority || factors.context_priority === factors.complexity_priority) {
      return 0.7
    }

    // Low confidence if factors conflict
    return 0.5
  }

  /**
   * Determine if task is structured (GLM specialty)
   */
  private isStructuredTask(task_type: RoutingContext['task_type']): boolean {
    return ['new_goal', 'roadmap', 'milestones', 'daily_actions', 'structured_plans', 'user_profiling'].includes(task_type)
  }

  /**
   * Determine if task is conversation-focused (Kimi specialty)
   */
  private isConversationTask(task_type: RoutingContext['task_type']): boolean {
    return task_type === 'deep_discussion'
  }

  /**
   * Determine if task is complex (Nemotron specialty)
   */
  private isComplexTask(task_type: RoutingContext['task_type']): boolean {
    return ['complex_analysis', 'strategic_planning', 'difficult_reasoning'].includes(task_type)
  }
}

export const modelRouter = new ModelRouter()

/**
 * Route helper function for common use cases
 */
export function routeForNewGoal(conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>): RoutingDecision {
  return modelRouter.route({
    task_type: 'new_goal',
    context_length: conversationHistory.length,
    conversation_history: conversationHistory,
    reasoning_complexity: 'low',
    confidence_level: 0.5
  })
}

export function routeForRoadmap(conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>): RoutingDecision {
  return modelRouter.route({
    task_type: 'roadmap',
    context_length: conversationHistory.length,
    conversation_history: conversationHistory,
    reasoning_complexity: 'medium',
    confidence_level: 0.7
  })
}

export function routeForDailyAction(conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>): RoutingDecision {
  return modelRouter.route({
    task_type: 'daily_actions',
    context_length: conversationHistory.length,
    conversation_history: conversationHistory,
    reasoning_complexity: 'low',
    confidence_level: 0.8
  })
}

export function routeForUserProfile(conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>): RoutingDecision {
  return modelRouter.route({
    task_type: 'user_profiling',
    context_length: conversationHistory.length,
    conversation_history: conversationHistory,
    reasoning_complexity: 'medium',
    confidence_level: 0.7
  })
}

export function routeForDeepDiscussion(conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>): RoutingDecision {
  return modelRouter.route({
    task_type: 'deep_discussion',
    context_length: conversationHistory.length,
    conversation_history: conversationHistory,
    reasoning_complexity: 'medium',
    confidence_level: 0.6
  })
}

export function routeForComplexAnalysis(conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>): RoutingDecision {
  return modelRouter.route({
    task_type: 'complex_analysis',
    context_length: conversationHistory.length,
    conversation_history: conversationHistory,
    reasoning_complexity: 'high',
    confidence_level: 0.4
  })
}
