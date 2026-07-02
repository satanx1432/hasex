const NVIDIA_NIM_ENDPOINT = process.env.NVIDIA_NIM_ENDPOINT || 'https://integrate.api.nvidia.com/v1'
const NVIDIA_NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY

// BGE M3: Best multilingual embedding model for RAG
// - Supports 100+ languages
// - 1024 embedding dimensions
// - Optimized for dense retrieval
const EMBEDDING_MODEL = 'BAAI/bge-m3'

class EmbeddingService {
  isConfigured(): boolean {
    return !!(NVIDIA_NIM_API_KEY && NVIDIA_NIM_API_KEY.length > 0)
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isConfigured()) {
      return this.fallbackEmbedding(text)
    }

    try {
      const response = await fetch(`${NVIDIA_NIM_ENDPOINT}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NVIDIA_NIM_API_KEY}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text.slice(0, 8000),
        }),
      })

      if (!response.ok) {
        return this.fallbackEmbedding(text)
      }

      const data = await response.json()
      return data.data[0].embedding
    } catch {
      return this.fallbackEmbedding(text)
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isConfigured()) {
      return texts.map(t => this.fallbackEmbedding(t))
    }

    try {
      const response = await fetch(`${NVIDIA_NIM_ENDPOINT}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NVIDIA_NIM_API_KEY}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: texts.map(t => t.slice(0, 8000)),
        }),
      })

      if (!response.ok) {
        return texts.map(t => this.fallbackEmbedding(t))
      }

      const data = await response.json()
      return data.data.map((d: any) => d.embedding)
    } catch {
      return texts.map(t => this.fallbackEmbedding(t))
    }
  }

  private fallbackEmbedding(text: string): number[] {
    const hash = this.simpleHash(text)
    const seed = hash % 1000000
    const embedding: number[] = []
    
    for (let i = 0; i < 1024; i++) {
      const seed_i = (seed + i * 31) % 1000000
      embedding.push((seed_i % 2000 - 1000) / 1000)
    }
    
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
    return embedding.map(v => v / norm)
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  async truncateTextForEmbedding(text: string, maxLength: number = 8000): Promise<string> {
    if (text.length <= maxLength) return text
    
    const charsToKeep = maxLength - 3
    return text.slice(0, charsToKeep) + '...'
  }
}

export const embeddingService = new EmbeddingService()