import { qdrantClient, MemoryPayload } from './qdrant-client'
import { embeddingService } from './embedding-service'

class MemoryStorage {
  async initialize(): Promise<void> {
    await qdrantClient.initialize()
  }

  async storeMessage(
    userId: string,
    chatId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<string> {
    const id = `${userId}_${chatId}_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const timestamp = new Date().toISOString()

    const truncatedContent = await embeddingService.truncateTextForEmbedding(content)
    const vector = await embeddingService.generateEmbedding(truncatedContent)

    const payload: MemoryPayload = {
      user_id: userId,
      chat_id: chatId,
      role,
      timestamp,
      content: truncatedContent,
    }

    await qdrantClient.upsertMessage(id, vector, payload)
    return id
  }

  async storeMessages(
    messages: Array<{
      userId: string
      chatId: string
      role: 'user' | 'assistant' | 'system'
      content: string
    }>
  ): Promise<string[]> {
    const ids: string[] = []
    
    for (const msg of messages) {
      const id = await this.storeMessage(msg.userId, msg.chatId, msg.role, msg.content)
      ids.push(id)
    }
    
    return ids
  }

  isReady(): boolean {
    return qdrantClient.isReady()
  }
}

export const memoryStorage = new MemoryStorage()