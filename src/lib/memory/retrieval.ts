import { qdrantClient, RetrievedMemory, MemoryPayload } from './qdrant-client'
import { embeddingService } from './embedding-service'

class MemoryRetrieval {
  async searchRelevantMemories(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<RetrievedMemory[]> {
    const vector = await embeddingService.generateEmbedding(query)
    return qdrantClient.searchMemories(vector, userId, limit)
  }

  async getRecentMessages(
    userId: string,
    chatId: string,
    limit: number = 20
  ): Promise<MemoryPayload[]> {
    return qdrantClient.getRecentMessages(userId, chatId, limit)
  }

  async getContextForResponse(
    userId: string,
    chatId: string,
    currentQuery: string,
    options: {
      recentMessagesLimit?: number
      semanticSearchLimit?: number
    } = {}
  ): Promise<{
    recentMessages: MemoryPayload[]
    semanticMemories: RetrievedMemory[]
  }> {
    const { recentMessagesLimit = 20, semanticSearchLimit = 5 } = options

    const [recentMessages, semanticMemories] = await Promise.all([
      this.getRecentMessages(userId, chatId, recentMessagesLimit),
      this.searchRelevantMemories(userId, currentQuery, semanticSearchLimit),
    ])

    return { recentMessages, semanticMemories }
  }

  async searchByMemoryType(
    userId: string,
    memoryType: 'goal' | 'preference' | 'project' | 'fact',
    query: string,
    limit: number = 3
  ) {
    const vector = await embeddingService.generateEmbedding(query)
    return qdrantClient.searchLongTermMemories(vector, userId, memoryType, limit)
  }

  deduplicateMemories(memories: RetrievedMemory[], threshold: number = 0.95): RetrievedMemory[] {
    const seen = new Set<string>()
    return memories.filter(m => {
      const key = m.payload.content.slice(0, 50)
      if (seen.has(key)) return false
      if (memories.some(other => other.id !== m.id && other.payload.content === m.payload.content)) {
        return false
      }
      seen.add(key)
      return true
    })
  }
}

export const memoryRetrieval = new MemoryRetrieval()