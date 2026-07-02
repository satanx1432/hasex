import { QdrantClient as QdrantSDKClient } from '@qdrant/js-client-rest'

export interface MemoryPoint {
  id: string
  vector: number[]
  payload: {
    content: string
    type: 'observation' | 'goal' | 'action' | 'reflection' | 'insight'
    userId: string
    timestamp: string
    metadata?: Record<string, any>
  }
}

class QdrantService {
  private client: QdrantSDKClient | null = null
  private collectionName: string

  constructor() {
    this.collectionName = process.env.QDRANT_COLLECTION_NAME || 'behavioral_os_memory'
  }

  private getClient(): QdrantSDKClient {
    if (!this.client) {
      this.client = new QdrantSDKClient({
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY,
      })
    }
    return this.client
  }

  async ensureCollection(): Promise<void> {
    try {
      const client = this.getClient()
      const collections = await client.getCollections()
      const collectionExists = collections.collections.some(
        c => c.name === this.collectionName
      )

      if (!collectionExists) {
        await client.createCollection(this.collectionName, {
          vectors: {
            size: 1024, // BGE M3 embedding dimension
            distance: 'Cosine',
          },
        })
        console.log(`Created Qdrant collection: ${this.collectionName}`)
      }
    } catch (error) {
      console.error('Failed to ensure Qdrant collection:', error)
    }
  }

  async addMemory(point: Omit<MemoryPoint, 'id'>): Promise<string> {
    try {
      const client = this.getClient()
      await this.ensureCollection()

      const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id,
            vector: point.vector,
            payload: point.payload,
          },
        ],
      })

      return id
    } catch (error) {
      console.error('Failed to add memory to Qdrant:', error)
      throw error
    }
  }

  async searchMemories(
    userId: string,
    queryVector: number[],
    limit: number = 10,
    filterType?: string
  ): Promise<MemoryPoint[]> {
    try {
      const client = this.getClient()
      
      const filter: any = {
        must: [
          {
            key: 'payload.userId',
            match: { value: userId },
          },
        ],
      }

      if (filterType) {
        filter.must.push({
          key: 'payload.type',
          match: { value: filterType },
        })
      }

      const results = await client.search(this.collectionName, {
        vector: queryVector,
        limit,
        filter,
        with_payload: true,
      })

      return results.map(r => ({
        id: r.id as string,
        vector: r.vector as number[],
        payload: r.payload as MemoryPoint['payload'],
      }))
    } catch (error) {
      console.error('Failed to search memories in Qdrant:', error)
      return []
    }
  }

  async getMemoriesByType(
    userId: string,
    type: MemoryPoint['payload']['type'],
    limit: number = 50
  ): Promise<MemoryPoint[]> {
    try {
      const client = this.getClient()
      
      const results = await client.scroll(this.collectionName, {
        filter: {
          must: [
            { key: 'payload.userId', match: { value: userId } },
            { key: 'payload.type', match: { value: type } },
          ],
        },
        limit,
        with_payload: true,
      })

      return results.points.map(p => ({
        id: p.id as string,
        vector: p.vector as number[],
        payload: p.payload as MemoryPoint['payload'],
      }))
    } catch (error) {
      console.error('Failed to get memories by type:', error)
      return []
    }
  }

  async deleteMemory(id: string): Promise<void> {
    try {
      const client = this.getClient()
      await client.delete(this.collectionName, {
        wait: true,
        points: [id],
      })
    } catch (error) {
      console.error('Failed to delete memory:', error)
    }
  }

  async deleteUserMemories(userId: string): Promise<void> {
    try {
      const client = this.getClient()
      await client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [
            { key: 'payload.userId', match: { value: userId } },
          ],
        },
      })
    } catch (error) {
      console.error('Failed to delete user memories:', error)
    }
  }

  async getCollectionStats(): Promise<{
    totalMemories: number
    memoryTypes: Record<string, number>
  }> {
    try {
      const client = this.getClient()
      const info = await client.getCollection(this.collectionName)
      
      const stats = {
        totalMemories: info.points_count || 0,
        memoryTypes: {} as Record<string, number>,
      }

      return stats
    } catch (error) {
      console.error('Failed to get collection stats:', error)
      return { totalMemories: 0, memoryTypes: {} }
    }
  }
}

export const qdrantService = new QdrantService()
export default qdrantService