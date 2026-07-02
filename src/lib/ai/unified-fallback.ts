/**
 * Unified AI Provider Fallback System
 * Tries providers in order: NVIDIA Key 1 → NVIDIA Key 2 → Groq → Cerebras → Gemini → GitHub → SambaNova
 */

import { AIService } from './ai-service'

export interface AIProvider {
  name: string
  priority: number
  isConfigured: () => boolean
  chat: (messages: any[], model?: string) => Promise<string>
}

export interface FallbackConfig {
  timeout: number
  maxRetries: number
  cooldownMs: number
}

// NVIDIA NIM Provider
class NVIDIAProvider implements AIProvider {
  name = 'nvidia'
  priority = 1
  private apiKeys: string[] = []
  private currentKeyIndex = 0
  private failureCount = 0
  private readonly MAX_FAILURES = 3

  constructor() {
    this.loadKeys()
  }

  private loadKeys() {
    const keys = [
      process.env.NVIDIA_NIM_API_KEY,
      process.env.NVIDIA_NIM_API_KEY_2,
    ].filter((key): key is string => Boolean(key && key.length > 0))
    this.apiKeys = keys
  }

  isConfigured(): boolean {
    return this.apiKeys.length > 0 || !!process.env.NVIDIA_NIM_API_KEY
  }

  private getCurrentKey(): string | null {
    if (this.apiKeys.length > 0) {
      return this.apiKeys[this.currentKeyIndex]
    }
    return process.env.NVIDIA_NIM_API_KEY || null
  }

  private rotateKey(): void {
    if (this.apiKeys.length > 1) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length
      this.failureCount = 0
    } else {
      this.failureCount++
    }
  }

  async chat(messages: any[], model: string = 'meta/llama-3.1-8b-instruct'): Promise<string> {
    const apiKey = this.getCurrentKey()
    if (!apiKey) throw new Error('No NVIDIA API key available')

    const endpoint = process.env.NVIDIA_NIM_ENDPOINT || 'https://integrate.api.nvidia.com/v1'
    
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        this.rotateKey()
        throw new Error('NVIDIA rate limit exceeded')
      }
      if (response.status === 401) {
        this.rotateKey()
        throw new Error('Invalid NVIDIA API key')
      }
      throw new Error(`NVIDIA API error: ${response.statusText}`)
    }

    this.failureCount = 0
    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }
}

// Groq Provider
class GroqProvider implements AIProvider {
  name = 'groq'
  priority = 3

  isConfigured(): boolean {
    return !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 0)
  }

  async chat(messages: any[], model: string = 'llama-3.3-70b-versatile'): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('Groq API key not configured')

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      if (response.status === 429) throw new Error('Groq rate limit exceeded')
      if (response.status === 401) throw new Error('Invalid Groq API key')
      const error = await response.json()
      throw new Error(`Groq API error: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }
}

// Cerebras Provider
class CerebrasProvider implements AIProvider {
  name = 'cerebras'
  priority = 4

  isConfigured(): boolean {
    return !!(process.env.CEREBRAS_API_KEY && process.env.CEREBRAS_API_KEY.length > 0)
  }

  async chat(messages: any[], model: string = 'llama-3.3-70b'): Promise<string> {
    const apiKey = process.env.CEREBRAS_API_KEY
    if (!apiKey) throw new Error('Cerebras API key not configured')

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      if (response.status === 429) throw new Error('Cerebras rate limit exceeded')
      if (response.status === 401) throw new Error('Invalid Cerebras API key')
      throw new Error(`Cerebras API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }
}

// Google Gemini Provider
class GeminiProvider implements AIProvider {
  name = 'gemini'
  priority = 5

  isConfigured(): boolean {
    return !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY.length > 0)
  }

  async chat(messages: any[], model: string = 'gemini-2.0-flash'): Promise<string> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) throw new Error('Google Gemini API key not configured')

    // Convert messages to Gemini format
    const contents = messages
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    )

    if (!response.ok) {
      if (response.status === 429) throw new Error('Gemini rate limit exceeded')
      if (response.status === 401) throw new Error('Invalid Gemini API key')
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }
}

// GitHub Provider (for GitHub Models / Copilot)
class GitHubProvider implements AIProvider {
  name = 'github'
  priority = 6

  isConfigured(): boolean {
    return !!(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.length > 0)
  }

  async chat(messages: any[], model: string = 'gpt-4o-mini'): Promise<string> {
    const token = process.env.GITHUB_TOKEN
    if (!token) throw new Error('GitHub token not configured')

    const response = await fetch('https://models.inference.ai.azure.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      if (response.status === 429) throw new Error('GitHub Models rate limit exceeded')
      if (response.status === 401) throw new Error('Invalid GitHub token')
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }
}

// SambaNova Provider
class SambaNovaProvider implements AIProvider {
  name = 'sambanova'
  priority = 7

  isConfigured(): boolean {
    return !!(process.env.SAMBANOVA_API_KEY && process.env.SAMBANOVA_API_KEY.length > 0)
  }

  async chat(messages: any[], model: string = 'Meta-Llama-3.1-8B-Instruct'): Promise<string> {
    const apiKey = process.env.SAMBANOVA_API_KEY
    if (!apiKey) throw new Error('SambaNova API key not configured')

    const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      if (response.status === 429) throw new Error('SambaNova rate limit exceeded')
      if (response.status === 401) throw new Error('Invalid SambaNova API key')
      throw new Error(`SambaNova API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }
}

// Unified AI Fallback Service
export class AIFallbackService {
  private providers: AIProvider[] = []
  private config: FallbackConfig

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = {
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 1,
      cooldownMs: config.cooldownMs || 60000,
    }

    // Initialize providers in priority order
    this.providers = [
      new NVIDIAProvider(),
      new GroqProvider(),
      new CerebrasProvider(),
      new GeminiProvider(),
      new GitHubProvider(),
      new SambaNovaProvider(),
    ].filter(p => p.isConfigured())
  }

  /**
   * Get the first available provider
   */
  getPrimaryProvider(): AIProvider | null {
    return this.providers[0] || null
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): AIProvider[] {
    return [...this.providers]
  }

  /**
   * Check if any provider is configured
   */
  isConfigured(): boolean {
    return this.providers.length > 0
  }

  /**
   * Chat with automatic fallback through all providers
   */
  async chat(messages: any[], model?: string): Promise<{ message: string; provider: string }> {
    const errors: string[] = []

    for (const provider of this.providers) {
      try {
        console.log(`Trying AI provider: ${provider.name}`)
        const response = await this.chatWithTimeout(provider, messages, model)
        return { message: response, provider: provider.name }
      } catch (error: any) {
        console.warn(`Provider ${provider.name} failed:`, error.message)
        errors.push(`${provider.name}: ${error.message}`)
        continue
      }
    }

    throw new Error(`All AI providers failed:\n${errors.join('\n')}`)
  }

  private async chatWithTimeout(provider: AIProvider, messages: any[], model?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${provider.name} request timed out`))
      }, this.config.timeout)

      provider.chat(messages, model)
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout))
    })
  }

  /**
   * Generate content with automatic fallback
   */
  async generate(prompt: string, context?: any): Promise<{ content: string; provider: string }> {
    const messages = [
      { role: 'system', content: 'You are a helpful AI assistant. Be concise and helpful.' },
      { role: 'user', content: prompt }
    ]

    return this.chat(messages)
  }
}

// Singleton instance
let aiServiceInstance: AIFallbackService | null = null

export function getAIService(): AIFallbackService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIFallbackService()
  }
  return aiServiceInstance
}

// Export individual providers for direct use
export { NVIDIAProvider, GroqProvider, CerebrasProvider, GeminiProvider, GitHubProvider, SambaNovaProvider }