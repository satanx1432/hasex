const GROQ_API_URL = 'https://api.groq.com/openai/v1'

export interface GroqChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GroqChatResponse {
  id: string
  message: {
    role: string
    content: string
  }
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class GroqService {
  private apiKey: string
  private model: string
  private fallbackModel: string

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || ''
    this.model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile'
    this.fallbackModel = process.env.GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant'
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  async chat(
    messages: GroqChatMessage[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ): Promise<GroqChatResponse> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY is not configured')
    }

    const model = options?.model || this.model
    const temperature = options?.temperature ?? 0.7
    const maxTokens = options?.maxTokens ?? 2048

    try {
      const response = await fetch(`${GROQ_API_URL}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Groq API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      
      return {
        id: data.id,
        message: {
          role: data.choices[0].message.role,
          content: data.choices[0].message.content,
        },
        model: data.model,
        usage: data.usage,
      }
    } catch (error) {
      console.error('Groq chat error:', error)
      throw error
    }
  }

  async chatWithFallback(
    messages: GroqChatMessage[],
    options?: {
      temperature?: number
      maxTokens?: number
    }
  ): Promise<GroqChatResponse> {
    try {
      return await this.chat(messages, { model: this.model, ...options })
    } catch (primaryError) {
      console.warn('Primary Groq model failed, trying fallback:', primaryError)
      
      try {
        return await this.chat(messages, { model: this.fallbackModel, ...options })
      } catch (fallbackError) {
        console.error('Fallback Groq model also failed:', fallbackError)
        throw fallbackError
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY is not configured')
    }

    try {
      const response = await fetch(`${GROQ_API_URL}/embeddings`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          input: text,
        }),
      })

      if (!response.ok) {
        throw new Error(`Groq embedding error: ${response.status}`)
      }

      const data = await response.json()
      return data.data[0].embedding
    } catch (error) {
      console.error('Groq embedding error:', error)
      throw error
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey
  }
}

export const groqService = new GroqService()
export default groqService