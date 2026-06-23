/**
 * Memory-Conversation Integration System
 * Connects the memory system with the conversation system
 * This is what makes conversation #100 better than conversation #1
 */

// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import { ContextAssembler } from './retrieval'
import { ContradictionResolver } from './contradiction'

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface MemoryEnhancedResponse {
  response: string
  context_used: {
    retrieved_memories: number
    behavioral_insights: number
    confidence_context: any
    intervention_history: any
  }
  reasoning: string
  personalization_level: 'low' | 'medium' | 'high'
}

export interface ConversationMemory {
  conversation_id: string
  user_id: string
  messages: ConversationMessage[]
  extraction_results: any
  memory_updates: any[]
  context_assembly: any
  timestamp: string
}

export class MemoryConversationIntegration {
  private supabase: any
  private contextAssembler: ContextAssembler
  private contradictionResolver: ContradictionResolver
  private userId: string

  constructor(supabaseUrl: string, supabaseKey: string, userId: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.contextAssembler = new ContextAssembler(supabaseUrl, supabaseKey)
    this.contradictionResolver = new ContradictionResolver(supabaseUrl, supabaseKey)
    this.userId = userId
  }

  /**
   * THE CRITICAL FUNCTION - Before AI Response
   * Assemble context from memory to make conversation #100 better than #1
   */
  async preResponseAssembly(
    conversationId: string,
    currentMessages: ConversationMessage[],
    userQuery: string
  ): Promise<{
    context: any
    fourQuestionsAnswered: {
      what_happened: string
      who_is_user: string
      how_do_they_act: string
      what_intervention_works: string
    }
  }> {
    // Assemble full context from all memory layers
    const context = await this.contextAssembler.assembleContext(
      this.userId,
      currentMessages,
      userQuery
    )

    // Answer the four critical questions
    const fourQuestionsAnswered = this.answerFourQuestions(context)

    return {
      context,
      fourQuestionsAnswered
    }
  }

  private answerFourQuestions(context: any): {
    what_happened: string
    who_is_user: string
    how_do_they_act: string
    what_intervention_works: string
  } {
    const { user_profile, behavioral_insights, intervention_history } = context

    // Question 1: What happened?
    const what_happened = this.synthesizeWhatHappened(user_profile)

    // Question 2: Who is this user?
    const who_is_user = this.synthesizeWhoIsUser(user_profile.semantic_traits)

    // Question 3: How do they act?
    const how_do_they_act = this.synthesizeHowDoTheyAct(
      user_profile.behavioral_patterns,
      behavioral_insights
    )

    // Question 4: What intervention works?
    const what_intervention_works = this.synthesizeWhatInterventionWorks(
      intervention_history,
      user_profile.behavioral_patterns
    )

    return {
      what_happened,
      who_is_user,
      how_do_they_act,
      what_intervention_works
    }
  }

  private synthesizeWhatHappened(userProfile: any): string {
    const { recent_milestones, recent_failures } = userProfile

    const parts: string[] = []

    if (recent_milestones.length > 0) {
      parts.push(`User achieved ${recent_milestones.length} recent milestones`)
    }

    if (recent_failures.length > 0) {
      parts.push(`User experienced ${recent_failures.length} recent failures`)
    }

    if (parts.length === 0) {
      return "User is just starting, limited history available"
    }

    return parts.join('. ')
  }

  private synthesizeWhoIsUser(traits: any[]): string {
    if (traits.length === 0) {
      return "User identity not well established yet"
    }

    const strongTraits = traits.filter(t => t.confidence > 0.7)
    const weakTraits = traits.filter(t => t.confidence < 0.4)

    const parts: string[] = []

    if (strongTraits.length > 0) {
      parts.push(`User strongly identifies as: ${strongTraits.map(t => t.value).join(', ')}`)
    }

    if (weakTraits.length > 0) {
      parts.push(`User is uncertain about: ${weakTraits.map(t => t.trait).join(', ')}`)
    }

    return parts.join('. ')
  }

  private synthesizeHowDoTheyAct(patterns: any[], insights: string[]): string {
    if (patterns.length === 0 && insights.length === 0) {
      return "User behavioral patterns not well established yet"
    }

    const consistentPatterns = patterns.filter(p => p.trend === 'stable' && p.confidence > 0.6)
    const evolvingPatterns = patterns.filter(p => p.trend !== 'stable')

    const parts: string[] = []

    if (consistentPatterns.length > 0) {
      parts.push(`Consistent behaviors: ${consistentPatterns.map(p => p.behavior_type).join(', ')}`)
    }

    if (evolvingPatterns.length > 0) {
      parts.push(`Evolving behaviors: ${evolvingPatterns.map(p => `${p.behavior_type} (${p.trend})`).join(', ')}`)
    }

    if (insights.length > 0) {
      parts.push(`Key insights: ${insights.slice(0, 3).join(', ')}`)
    }

    return parts.join('. ')
  }

  private synthesizeWhatInterventionWorks(
    interventionHistory: any,
    behavioralPatterns: any[]
  ): string {
    const { successful, failed } = interventionHistory

    const parts: string[] = []

    if (successful.length > 0) {
      const successTypes = [...new Set(successful.map((s: any) => s.behavior_type))]
      parts.push(`Successful interventions: ${successTypes.join(', ')}`)
    }

    if (failed.length > 0) {
      const failureTypes = [...new Set(failed.map((f: any) => f.behavior_type))]
      parts.push(`Failed interventions: ${failureTypes.join(', ')}`)
    }

    // Check for response to pressure patterns
    const pressureResponse = behavioralPatterns.find(p => p.behavior_type === 'response_to_pressure')
    if (pressureResponse) {
      parts.push(`Pressure response: ${pressureResponse.observation}`)
    }

    if (parts.length === 0) {
      return "Intervention effectiveness not well established yet"
    }

    return parts.join('. ')
  }

  /**
   * Generate AI response with memory context
   */
  async generateMemoryEnhancedResponse(
    conversationId: string,
    userQuery: string,
    conversationHistory: ConversationMessage[],
    aiGenerationFn: (context: any, query: string) => Promise<string>
  ): Promise<MemoryEnhancedResponse> {
    // Step 1: Pre-response assembly (CRITICAL)
    const { context, fourQuestionsAnswered } = await this.preResponseAssembly(
      conversationId,
      conversationHistory,
      userQuery
    )

    // Step 2: Generate response with context
    const systemPrompt = this.buildMemoryEnhancedSystemPrompt(context, fourQuestionsAnswered)
    
    // Update conversation history with system prompt
    const enhancedHistory: ConversationMessage[] = [
      { role: 'system', content: systemPrompt, timestamp: new Date().toISOString() },
      ...conversationHistory
    ]

    // Call AI generation function with enhanced context
    const response = await aiGenerationFn(context, userQuery)

    // Step 3: Post-conversation processing
    const updatedHistory: ConversationMessage[] = [
      ...conversationHistory,
      { role: 'user', content: userQuery, timestamp: new Date().toISOString() },
      { role: 'assistant', content: response, timestamp: new Date().toISOString() }
    ]

    await this.postConversationProcessing(conversationId, updatedHistory)

    return {
      response,
      context_used: {
        retrieved_memories: context.relevant_past_events.length,
        behavioral_insights: context.behavioral_insights.length,
        confidence_context: context.confidence_context,
        intervention_history: context.intervention_history
      },
      reasoning: fourQuestionsAnswered.what_intervention_works,
      personalization_level: this.calculatePersonalizationLevel(context)
    }
  }

  private buildMemoryEnhancedSystemPrompt(context: any, fourQuestions: any): string {
    return `You are an AI execution coach with deep understanding of this user.

CRITICAL CONTEXT ABOUT THIS USER:

**What happened recently:**
${fourQuestions.what_happened}

**Who this user is:**
${fourQuestions.who_is_user}

**How they act:**
${fourQuestions.how_do_they_act}

**What interventions work:**
${fourQuestions.what_intervention_works}

**Current behavioral insights:**
${context.behavioral_insights.join('\n')}

**Current trends:**
${Object.entries(context.user_profile.current_trends)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

**High confidence traits (believe these):**
${context.confidence_context.high_confidence_traits.map((t: any) => `${t.trait}: ${t.value} (${t.confidence})`).join('\n')}

**Uncertain traits (treat cautiously):**
${context.confidence_context.uncertain_traits.map((t: any) => `${t.trait}: ${t.value} (${t.confidence})`).join('\n')}

**Evolving patterns (adapting):**
${context.confidence_context.evolving_patterns.map((p: any) => `${p.behavior_type}: ${p.observation} (${p.trend})`).join('\n')}

GUIDELINES:
1. Use high-confidence traits as facts in your coaching
2. Acknowledge uncertainty in low-confidence traits
3. Consider evolving patterns when making recommendations
4. Adapt your approach based on what interventions worked before
5. Reference specific past events when relevant
6. Challenge contradictions between stated beliefs and actual behavior
7. Predict when user might struggle based on patterns
8. Celebrate wins, analyze failures constructively

If you cannot answer these four questions based on the context provided, admit uncertainty and ask for more information before making recommendations.`
  }

  private calculatePersonalizationLevel(context: any): 'low' | 'medium' | 'high' {
    const totalMemories = 
      context.user_profile.semantic_traits.length +
      context.user_profile.behavioral_patterns.length +
      context.relevant_past_events.length

    const highConfidenceMemories = 
      context.confidence_context.high_confidence_traits.length +
      context.user_profile.behavioral_patterns.filter((p: any) => p.confidence > 0.7).length

    if (totalMemories < 10) {
      return 'low'
    } else if (totalMemories < 30 || highConfidenceMemories < 5) {
      return 'medium'
    } else {
      return 'high'
    }
  }

  /**
   * Post-conversation processing - Extract and update memories
   */
  async postConversationProcessing(
    conversationId: string,
    messages: ConversationMessage[]
  ): Promise<void> {
    // Simplified version without extraction agent
    const extractionResults = {
      new_memories: [],
      updated_memories: [],
      confidence_updates: []
    }

    // Step 2: Check for contradictions
    for (const newMemory of extractionResults.new_memories) {
      const resolution = await this.contradictionResolver.resolveContradictions(
        this.userId,
        newMemory,
        messages
      )

      if (resolution.resolved) {
        console.log(`Resolved ${resolution.contradictions.length} contradictions for memory`)
      }
    }

    // Step 3: Store conversation memory
    await this.storeConversationMemory(conversationId, messages, extractionResults)
  }

  private async storeConversationMemory(
    conversationId: string,
    messages: ConversationMessage[],
    extractionResults: any
  ): Promise<void> {
    const conversationMemory: ConversationMemory = {
      conversation_id: conversationId,
      user_id: this.userId,
      messages,
      extraction_results: extractionResults,
      memory_updates: extractionResults.new_memories,
      context_assembly: null, // Would be populated if we saved context
      timestamp: new Date().toISOString()
    }

    try {
      await this.supabase.from('conversation_memories').insert(conversationMemory)
    } catch (error) {
      console.error('Failed to store conversation memory:', error)
      // Don't fail the operation if storage fails
    }
  }

  /**
   * Get conversation history for context
   */
  async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_memories')
        .select('messages')
        .eq('conversation_id', conversationId)
        .single()

      if (error) {
        console.error('Failed to get conversation history:', error)
        return []
      }

      return data?.messages || []
    } catch (error) {
      console.error('Failed to get conversation history:', error)
      return []
    }
  }

  /**
   * Get user's complete memory profile
   */
  async getUserMemoryProfile(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('current_user_profile')
        .select('*')
        .eq('user_id', this.userId)
        .single()

      if (error) {
        console.error('Failed to get user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to get user profile:', error)
      return null
    }
  }
}

/**
 * Factory function to create memory-enhanced conversation handler
 */
export function createMemoryEnhancedConversation(
  supabaseUrl: string,
  supabaseKey: string,
  userId: string
): MemoryConversationIntegration {
  return new MemoryConversationIntegration(supabaseUrl, supabaseKey, userId)
}

/**
 * Example usage in a chat component:
 */
/*
import { createMemoryEnhancedConversation } from './memory/integration'

// Initialize
const memoryConversation = createMemoryEnhancedConversation(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  userId
)

// In your chat handler:
async function handleUserMessage(userQuery: string, conversationHistory: any[]) {
  const { response, context_used, personalization_level } = 
    await memoryConversation.generateMemoryEnhancedResponse(
      conversationId,
      userQuery,
      conversationHistory,
      async (context, query) => {
        // Your AI generation function here
        return await generateAIResponse(context, query)
      }
    )
  
  console.log(`Response generated with ${personalization_level} personalization`)
  console.log(`Used ${context_used.retrieved_memories} memories`)
  
  return response
}
*/
