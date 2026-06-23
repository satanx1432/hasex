import { memoryStorage } from './storage'
import { memoryRetrieval } from './retrieval'
import { memoryExtraction } from './extraction'
import { ConversationContext, LongTermMemory, RetrievedMemory, MemoryPayload } from './qdrant-client'

class ContextInjection {
  async buildContext(
    userId: string,
    chatId: string,
    currentQuery: string,
    options: {
      recentMessagesLimit?: number
      semanticSearchLimit?: number
      includeLongTermMemories?: boolean
    } = {}
  ): Promise<ConversationContext> {
    const {
      recentMessagesLimit = 20,
      semanticSearchLimit = 5,
      includeLongTermMemories = true,
    } = options

    const { recentMessages, semanticMemories } = await memoryRetrieval.getContextForResponse(
      userId,
      chatId,
      currentQuery,
      { recentMessagesLimit, semanticSearchLimit }
    )

    let longTermMemories: LongTermMemory[] = []
    let extractedFacts = {
      goals: [] as string[],
      preferences: [] as string[],
      projects: [] as string[],
      facts: [] as string[],
    }

    if (includeLongTermMemories) {
      longTermMemories = await memoryExtraction.getLongTermMemories(userId)
      
      const goals = longTermMemories.filter(m => m.memory_type === 'goal').map(m => m.content)
      const preferences = longTermMemories.filter(m => m.memory_type === 'preference').map(m => m.content)
      const projects = longTermMemories.filter(m => m.memory_type === 'project').map(m => m.content)
      const facts = longTermMemories.filter(m => m.memory_type === 'fact').map(m => m.content)

      extractedFacts = { goals, preferences, projects, facts }
    }

    return {
      recentMessages,
      semanticMemories,
      longTermMemories,
      extractedFacts,
    }
  }

  injectContextIntoMessages(
    messages: Array<{ role: string; content: string }>,
    context: ConversationContext
  ): Array<{ role: string; content: string }> {
    const contextParts: string[] = []

    if (context.extractedFacts.goals.length > 0) {
      contextParts.push(`User's goals: ${context.extractedFacts.goals.join(', ')}`)
    }
    if (context.extractedFacts.preferences.length > 0) {
      contextParts.push(`User's preferences: ${context.extractedFacts.preferences.join(', ')}`)
    }
    if (context.extractedFacts.projects.length > 0) {
      contextParts.push(`User's projects: ${context.extractedFacts.projects.join(', ')}`)
    }
    if (context.extractedFacts.facts.length > 0) {
      contextParts.push(`Important facts about user: ${context.extractedFacts.facts.join(', ')}`)
    }

    const recentContext = context.recentMessages.length > 0
      ? `Recent conversation:\n${context.recentMessages.map(m => `[${m.role}] ${m.content}`).join('\n')}`
      : ''

    const semanticContext = context.semanticMemories.length > 0
      ? `Relevant memories:\n${context.semanticMemories.map(m => `- ${m.payload.content}`).join('\n')}`
      : ''

    const contextBlock = [
      '=== CONTEXT (for reference only, do not mention explicitly) ===',
      ...contextParts,
      recentContext,
      semanticContext,
      '============================================================',
    ].filter(Boolean).join('\n')

    if (messages.length > 0 && messages[0].role === 'system') {
      const systemMessage = messages[0]
      const originalContent = systemMessage.content
      
      if (!originalContent.includes('=== CONTEXT')) {
        return [
          { role: 'system', content: `${originalContent}\n\n${contextBlock}` },
          ...messages.slice(1),
        ]
      }
    }

    return [
      { role: 'system', content: contextBlock },
      ...messages,
    ]
  }

  estimateTokenUsage(messages: Array<{ role: string; content: string }>): number {
    return messages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0)
  }

  trimContextIfNeeded(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number = 120000
  ): Array<{ role: string; content: string }> {
    let currentMessages = [...messages]
    
    while (this.estimateTokenUsage(currentMessages) > maxTokens && currentMessages.length > 2) {
      const systemMsg = currentMessages[0].role === 'system' ? currentMessages[0] : null
      const otherMsgs = systemMsg ? currentMessages.slice(1) : currentMessages
      
      otherMsgs.splice(0, Math.min(5, otherMsgs.length))
      currentMessages = systemMsg ? [systemMsg, ...otherMsgs] : otherMsgs
    }

    return currentMessages
  }
}

export const contextInjection = new ContextInjection()

export { memoryStorage } from './storage'
export { memoryRetrieval } from './retrieval'
export { memoryExtraction } from './extraction'
export type { ConversationContext } from './qdrant-client'