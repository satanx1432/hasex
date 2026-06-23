import { QdrantClient as QdrantRestClient } from '@qdrant/js-client-rest'

export interface MemoryPayload {
  user_id: string
  chat_id: string
  role: 'user' | 'assistant' | 'system'
  timestamp: string
  content: string
  [key: string]: unknown
}

export interface LongTermMemory {
  id: string
  user_id: string
  memory_type: 'goal' | 'preference' | 'project' | 'fact'
  content: string
  extracted_at: string
  confidence: number
  source_messages: string[]
}

export interface RetrievedMemory {
  id: string
  score: number
  payload: MemoryPayload
}

export interface ConversationContext {
  recentMessages: MemoryPayload[]
  semanticMemories: RetrievedMemory[]
  longTermMemories: LongTermMemory[]
  extractedFacts: {
    goals: string[]
    preferences: string[]
    projects: string[]
    facts: string[]
  }
}

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333'
const QDRANT_API_KEY = process.env.QDRANT_API_KEY
const COLLECTION_NAME = 'chat_memories'
const MEMORY_COLLECTION = 'long_term_memories'
const VECTOR_SIZE = 1024

class QdrantClient {
  private client: QdrantRestClient
  private isConfigured: boolean

  constructor() {
    this.isConfigured = !!(process.env.QDRANT_URL)
    this.client = new QdrantRestClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    })
  }

  async initialize(): Promise<void> {
    if (!this.isConfigured) {
      console.warn('Qdrant not configured. Memory persistence disabled.')
      return
    }

    try {
      await this.createCollectionIfNotExists(COLLECTION_NAME)
      await this.createCollectionIfNotExists(MEMORY_COLLECTION)
    } catch (error) {
      console.error('Failed to initialize Qdrant collections:', error)
    }
  }

  private async createCollectionIfNotExists(name: string): Promise<void> {
    try {
      await this.client.getCollection(name)
    } catch (error) {
      // Collection doesn't exist, create it
      await this.client.createCollection(name, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      })
    }
  }

  async upsertMessage(
    id: string,
    vector: number[],
    payload: MemoryPayload
  ): Promise<void> {
    if (!this.isConfigured) return

    await this.client.upsert(COLLECTION_NAME, {
      points: [{ id, vector, payload }],
    })
  }

  async searchMemories(
    queryVector: number[],
    userId: string,
    limit: number = 10
  ): Promise<RetrievedMemory[]> {
    if (!this.isConfigured) return []

    try {
      const results = await this.client.search(COLLECTION_NAME, {
        vector: queryVector,
        limit,
        filter: {
          must: [
            {
              key: 'user_id',
              match: { value: userId },
            },
          ],
        },
        with_payload: true,
      })

      return results.map((point) => ({
        id: point.id as string,
        score: point.score || 0,
        payload: point.payload as MemoryPayload,
      }))
    } catch (error) {
      console.error('Error searching memories:', error)
      return []
    }
  }

  async getRecentMessages(userId: string, chatId: string, limit: number = 20): Promise<MemoryPayload[]> {
    if (!this.isConfigured) return []

    try {
      const results = await this.client.scroll(COLLECTION_NAME, {
        filter: {
          must: [
            { key: 'user_id', match: { value: userId } },
            { key: 'chat_id', match: { value: chatId } },
          ],
        },
        limit,
        with_payload: true,
      })

      return results.points.map((point) => point.payload as MemoryPayload).reverse()
    } catch (error) {
      console.error('Error getting recent messages:', error)
      return []
    }
  }

  async upsertLongTermMemory(
    id: string,
    vector: number[],
    payload: Omit<LongTermMemory, 'id'>
  ): Promise<void> {
    if (!this.isConfigured) return

    await this.client.upsert(MEMORY_COLLECTION, {
      points: [{ id, vector, payload }],
    })
  }

  async searchLongTermMemories(
    queryVector: number[],
    userId: string,
    memoryType?: string,
    limit: number = 5
  ): Promise<LongTermMemory[]> {
    if (!this.isConfigured) return []

    const filter: any = {
      must: [{ key: 'user_id', match: { value: userId } }],
    }

    if (memoryType) {
      filter.must.push({ key: 'memory_type', match: { value: memoryType } })
    }

    try {
      const results = await this.client.search(MEMORY_COLLECTION, {
        vector: queryVector,
        limit,
        filter,
        with_payload: true,
      })

      return results.map((point) => point.payload as unknown as LongTermMemory)
    } catch (error) {
      console.error('Error searching long-term memories:', error)
      return []
    }
  }

  isReady(): boolean {
    return this.isConfigured
  }
}

export const qdrantClient = new QdrantClient()