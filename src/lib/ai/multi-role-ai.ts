import { NVIDIANIMService } from './nvidia-nim'
import { followUpQuestionService } from './follow-up-questions'

export type AIRole = 'coach' | 'advisor' | 'task_manager' | 'motivator' | 'analyst'

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  metadata?: {
    ai_role: AIRole
    confidence: number
    reasoning?: string
  }
}

export interface AIResponse {
  message: string
  role: AIRole
  confidence: number
  suggested_actions?: string[]
  follow_up_questions?: string[]
}

export interface AIContext {
  user_id: string
  goal: string
  current_task?: string
  user_state: {
    mood?: string
    energy_level?: number
    confidence?: number
    recent_performance?: {
      success_rate: number
      streak: number
      missed_actions: number
    }
  }
  conversation_history: AIMessage[]
  time_context: {
    time_of_day: string
    day_of_week: string
    urgency_level: 'low' | 'medium' | 'high'
  }
}

const ROLE_PROMPTS: Record<AIRole, string> = {
  coach: `You are an expert behavioral coach specializing in goal achievement and habit formation. Your approach is:
- Direct and professional, but encouraging
- Focused on actionable guidance
- Evidence-based (citing behavioral science principles when relevant)
- Solution-oriented
- Concise - get to the point quickly

Your role is to help users stay on track, overcome obstacles, and maintain momentum.`,
  
  advisor: `You are a strategic advisor helping users optimize their goal achievement approach. Your focus is on:
- Providing expert recommendations
- Analyzing patterns and suggesting improvements
- Offering alternative perspectives
- Long-term thinking and planning
- Data-driven insights

Your role is to help users make smart decisions about their approach.`,
  
  task_manager: `You are a practical task manager focused on execution and organization. Your priorities are:
- Breaking down complex goals into actionable steps
- Prioritizing effectively
- Scheduling and time management
- Resource allocation
- Progress tracking

Your role is to help users get things done efficiently.`,
  
  motivator: `You are a motivational expert who understands human psychology. Your approach is:
- Authentic and grounded (not cheesy)
- Recognition of effort and progress
- Perspective shifts during challenges
- Celebration of wins
- Connection to deeper purpose

Your role is to help users maintain motivation and resilience.`,
  
  analyst: `You are a behavioral analyst who identifies patterns and insights. Your focus is on:
- Data interpretation
- Pattern recognition
- Trend analysis
- Predictive insights
- Root cause analysis

Your role is to help users understand their behavior and make data-driven decisions.`
}

export class MultiRoleAIService {
  private nvidiaService: NVIDIANIMService
  private defaultModel = 'meta/llama-3.1-8b-instruct'

  constructor() {
    this.nvidiaService = new NVIDIANIMService()
  }

  async determineOptimalRole(context: AIContext): Promise<AIRole> {
    // Determine the most appropriate role based on context
    const { user_state, time_context, conversation_history } = context

    // High urgency or immediate task needs -> task_manager
    if (time_context.urgency_level === 'high') {
      return 'task_manager'
    }

    // Low confidence or struggling -> coach
    if (user_state.confidence !== undefined && user_state.confidence < 0.4) {
      return 'coach'
    }

    // Recent failures or missed actions -> coach + analyst
    if (user_state.recent_performance?.missed_actions && user_state.recent_performance.missed_actions > 2) {
      return 'coach'
    }

    // Low energy or mood concerns -> motivator
    if (user_state.energy_level !== undefined && user_state.energy_level < 0.4) {
      return 'motivator'
    }

    // Strategic questions or planning -> advisor
    const lastUserMessage = conversation_history
      .filter(m => m.role === 'user')
      .pop()
    
    if (lastUserMessage) {
      const message = lastUserMessage.content.toLowerCase()
      if (message.includes('plan') || message.includes('strategy') || message.includes('approach') || message.includes('best way')) {
        return 'advisor'
      }
      if (message.includes('analyze') || message.includes('pattern') || message.includes('trend') || message.includes('understand')) {
        return 'analyst'
      }
      if (message.includes('motivat') || message.includes('stuck') || message.includes('discourage') || message.includes('give up')) {
        return 'motivator'
      }
      if (message.includes('task') || message.includes('do') || message.includes('action') || message.includes('step')) {
        return 'task_manager'
      }
    }

    // Default to coach for general guidance
    return 'coach'
  }

  async generateResponse(
    userMessage: string,
    context: AIContext,
    forcedRole?: AIRole
  ): Promise<AIResponse> {
    const role = forcedRole || await this.determineOptimalRole(context)
    
    const systemPrompt = this.buildSystemPrompt(role, context)
    const userPrompt = this.buildUserPrompt(userMessage, context, role)

    try {
      const response = await this.nvidiaService.makeRequest(
        this.defaultModel,
        [
          { role: 'system', content: systemPrompt },
          ...this.formatConversationHistory(context.conversation_history),
          { role: 'user', content: userPrompt },
        ],
        0.7,
        1024
      )

      return {
        message: response,
        role,
        confidence: this.calculateConfidence(context, role),
        suggested_actions: await this.extractSuggestedActions(response, role),
        follow_up_questions: await this.generateFollowUpQuestions(response, context, role),
      }
    } catch (error) {
      console.error('Failed to generate AI response:', error)
      return this.getFallbackResponse(role, context)
    }
  }

  private buildSystemPrompt(role: AIRole, context: AIContext): string {
    const basePrompt = ROLE_PROMPTS[role]
    
    const contextInfo = `
CURRENT CONTEXT:
- Goal: ${context.goal}
- Time: ${context.time_context.day_of_week} ${context.time_context.time_of_day}
- Urgency: ${context.time_context.urgency_level}
- User confidence: ${context.user_state.confidence ?? 'unknown'}
- Recent success rate: ${context.user_state.recent_performance?.success_rate ?? 'unknown'}%
- Current streak: ${context.user_state.recent_performance?.streak ?? 0} days

RESPONSE GUIDELINES:
- Be concise and direct (2-4 sentences typically)
- Focus on actionable guidance
- Be professional but approachable
- Avoid fluff and filler
- If suggesting actions, be specific
- End with clear next steps when appropriate
`

    return `${basePrompt}\n${contextInfo}`
  }

  private buildUserPrompt(userMessage: string, context: AIContext, role: AIRole): string {
    let prompt = `User message: "${userMessage}"\n\n`

    if (context.current_task) {
      prompt += `Current task: ${context.current_task}\n`
    }

    if (context.user_state.mood) {
      prompt += `Current mood: ${context.user_state.mood}\n`
    }

    prompt += `\nAs the ${role}, provide a helpful response.`

    return prompt
  }

  private formatConversationHistory(history: AIMessage[]): Array<{ role: string; content: string }> {
    // Format conversation history for the AI, excluding system messages
    return history
      .filter(m => m.role !== 'system')
      .slice(-5) // Keep only last 5 messages for context
      .map(m => ({
        role: m.role,
        content: m.content,
      }))
  }

  private calculateConfidence(context: AIContext, role: AIRole): number {
    // Calculate confidence based on context match with role
    let confidence = 0.7 // Base confidence

    const { user_state, time_context } = context

    // Role-specific confidence boosts
    if (role === 'task_manager' && time_context.urgency_level === 'high') {
      confidence += 0.2
    }
    if (role === 'coach' && user_state.confidence !== undefined && user_state.confidence < 0.5) {
      confidence += 0.2
    }
    if (role === 'motivator' && user_state.energy_level !== undefined && user_state.energy_level < 0.5) {
      confidence += 0.2
    }

    return Math.min(confidence, 1.0)
  }

  private async extractSuggestedActions(response: string, role: AIRole): Promise<string[]> {
    // Extract action items from the response
    const actionPatterns = [
      /(?:suggest|recommend|try|should|could)\s+(?:to\s+)?(.+?)(?:\.|!|\n|$)/gi,
      /(?:action|step|next)\s*:?\s*(.+?)(?:\.|!|\n|$)/gi,
    ]

    const actions: string[] = []

    actionPatterns.forEach(pattern => {
      const matches = response.match(pattern)
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/^(suggest|recommend|try|should|could|action|step|next)\s*(to\s*:?\s*)?/i, '').trim()
          if (cleaned.length > 5 && cleaned.length < 200) {
            actions.push(cleaned)
          }
        })
      }
    })

    return actions.slice(0, 3) // Max 3 actions
  }

  private async generateFollowUpQuestions(response: string, context: AIContext, role: AIRole): Promise<string[]> {
    // Generate relevant follow-up questions based on the response and role
    const questionPrompts: Record<AIRole, string[]> = {
      coach: [
        'What specific aspect of this would you like to explore further?',
        'How does this align with your current priorities?',
        'What resources do you need to implement this?',
      ],
      advisor: [
        'Would you like me to analyze the potential trade-offs?',
        'Should we explore alternative approaches?',
        'What timeline are you considering for this?',
      ],
      task_manager: [
        'When would you like to start this?',
        'Do you need help breaking this down further?',
        'What might get in the way of completing this?',
      ],
      motivator: [
        'What aspect of this feels most exciting to you?',
        'How can we build on this momentum?',
        'What would success look like for you?',
      ],
      analyst: [
        'Would you like me to dive deeper into the data?',
        'What patterns should we focus on?',
        'How does this compare to your typical behavior?',
      ],
    }

    return questionPrompts[role].slice(0, 2)
  }

  private getFallbackResponse(role: AIRole, context: AIContext): AIResponse {
    const fallbackMessages: Record<AIRole, string> = {
      coach: `I'm here to help you with "${context.goal}". What specific challenge are you facing right now?`,
      advisor: `Let's think strategically about your goal. What aspect would you like to optimize?`,
      task_manager: `Let's break this down into actionable steps. What's the first thing you need to do?`,
      motivator: `You're making progress by engaging with your goal. What's motivating you right now?`,
      analyst: `Let's look at the data. What patterns are you noticing in your progress?`,
    }

    return {
      message: fallbackMessages[role],
      role,
      confidence: 0.5,
      suggested_actions: [],
      follow_up_questions: [],
    }
  }

  async switchRole(newRole: AIRole, context: AIContext): Promise<string> {
    // Generate a transition message when switching roles
    const transitionMessages: Record<AIRole, string> = {
      coach: "Let me put on my coaching hat. I'm here to help you work through challenges and stay on track.",
      advisor: "Let me approach this from a strategic perspective. I'll help you think through the best approach.",
      task_manager: "Let's focus on execution. I'll help you break this down into concrete steps.",
      motivator: "Let's talk about what's driving you. I'm here to help you find and maintain your motivation.",
      analyst: "Let me look at this analytically. I'll help you understand the patterns and data.",
    }

    return transitionMessages[newRole]
  }

  async getMultiRolePerspective(
    question: string,
    context: AIContext
  ): Promise<Record<AIRole, string>> {
    // Get perspectives from multiple roles for comprehensive guidance
    const roles: AIRole[] = ['coach', 'advisor', 'task_manager']
    const perspectives: Record<AIRole, string> = {} as any

    for (const role of roles) {
      try {
        const response = await this.generateResponse(question, context, role)
        perspectives[role] = response.message
      } catch (error) {
        console.error(`Failed to get ${role} perspective:`, error)
        perspectives[role] = this.getFallbackResponse(role, context).message
      }
    }

    return perspectives
  }
}

export const multiRoleAIService = new MultiRoleAIService()