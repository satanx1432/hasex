// NVIDIA API Key Fallback System
// Rotates through multiple API keys to avoid rate limits

export interface NvidiaApiConfig {
  apiKeys: string[]
  currentIndex: number
  lastUsed: number
  failureCount: number
}

class NvidiaApiKeyManager {
  private config: NvidiaApiConfig
  private readonly MAX_FAILURES = 3
  private readonly COOLDOWN_MS = 60000 // 1 minute cooldown after failures

  constructor() {
    this.config = this.loadConfig()
  }

  private loadConfig(): NvidiaApiConfig {
    if (typeof window === 'undefined') {
      return this.getDefaultConfig()
    }
    
    const stored = localStorage.getItem('nvidia_api_config')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return this.getDefaultConfig()
      }
    }
    return this.getDefaultConfig()
  }

  private getDefaultConfig(): NvidiaApiConfig {
    // Load from environment variables - up to 4 keys
    const apiKeys = [
      process.env.NEXT_PUBLIC_NVIDIA_API_KEY_1,
      process.env.NEXT_PUBLIC_NVIDIA_API_KEY_2,
      process.env.NEXT_PUBLIC_NVIDIA_API_KEY_3,
      process.env.NEXT_PUBLIC_NVIDIA_API_KEY_4,
    ].filter((key): key is string => Boolean(key))

    return {
      apiKeys,
      currentIndex: 0,
      lastUsed: 0,
      failureCount: 0,
    }
  }

  private saveConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nvidia_api_config', JSON.stringify(this.config))
    }
  }

  // Get current active API key
  getCurrentKey(): string | null {
    if (this.config.apiKeys.length === 0) {
      return process.env.NEXT_PUBLIC_NVIDIA_API_KEY || null
    }
    return this.config.apiKeys[this.config.currentIndex] || null
  }

  // Rotate to next key after failure
  rotateKey(): string | null {
    if (this.config.apiKeys.length <= 1) {
      this.config.failureCount++
      return this.getCurrentKey()
    }

    this.config.currentIndex = (this.config.currentIndex + 1) % this.config.apiKeys.length
    this.config.lastUsed = Date.now()
    this.config.failureCount = 0
    this.saveConfig()

    return this.getCurrentKey()
  }

  // Mark current key as failed
  markFailure(): void {
    this.config.failureCount++
    
    if (this.config.failureCount >= this.MAX_FAILURES) {
      console.log(`Key ${this.config.currentIndex} failed ${this.MAX_FAILURES} times, rotating...`)
      this.rotateKey()
    }
  }

  // Mark current key as successful
  markSuccess(): void {
    this.config.failureCount = 0
    this.config.lastUsed = Date.now()
    this.saveConfig()
  }

  // Check if we should use fallback (all keys failed recently)
  shouldUseFallback(): boolean {
    const cooldownEnd = this.config.lastUsed + this.COOLDOWN_MS
    return this.config.failureCount >= this.config.apiKeys.length && Date.now() < cooldownEnd
  }

  // Get all available keys (for admin/debugging)
  getAllKeys(): string[] {
    return this.config.apiKeys
  }

  // Get status info
  getStatus(): { currentIndex: number; totalKeys: number; failureCount: number } {
    return {
      currentIndex: this.config.currentIndex,
      totalKeys: this.config.apiKeys.length,
      failureCount: this.config.failureCount,
    }
  }

  // Reset all failure counts
  reset(): void {
    this.config.failureCount = 0
    this.config.currentIndex = 0
    this.saveConfig()
  }
}

// Singleton instance
export const nvidiaKeyManager = new NvidiaApiKeyManager()

// ============================================================================
// NVIDIA API Client with Fallback Support
// ============================================================================

export interface NvidiaApiOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  fallbackModels?: string[]
}

export async function callNvidiaApi(
  prompt: string,
  options: NvidiaApiOptions = {}
): Promise<{ text: string; model: string; fallbackUsed: boolean }> {
  const {
    model = 'nvidia/llama-3.1-nemotron-70b-instruct',
    temperature = 0.5,
    maxTokens = 1024,
    fallbackModels = [
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'nvidia/llama-3.3-nemotron-super-49b-v1',
      'mistralai/mixtral-8x22b-instruct-v0.1',
      'google/gemma-2-27b-it',
    ],
  } = options

  const keyManager = nvidiaKeyManager
  let attempts = 0
  const maxAttempts = fallbackModels.length * 2 // Try each model twice

  while (attempts < maxAttempts) {
    const apiKey = keyManager.getCurrentKey()
    
    if (!apiKey) {
      throw new Error('No NVIDIA API key available')
    }

    const currentModel = fallbackModels[attempts % fallbackModels.length]

    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (response.status === 401) {
        // Invalid API key - rotate immediately
        console.warn('NVIDIA API key invalid, rotating...')
        keyManager.markFailure()
        attempts++
        continue
      }

      if (response.status === 429) {
        // Rate limited - rotate and retry
        console.warn('NVIDIA API rate limited, rotating to next key...')
        keyManager.markFailure()
        attempts++
        continue
      }

      if (!response.ok) {
        throw new Error(`NVIDIA API error: ${response.status}`)
      }

      const data = await response.json()
      keyManager.markSuccess()

      return {
        text: data.choices[0]?.message?.content || '',
        model: currentModel,
        fallbackUsed: attempts > 0,
      }
    } catch (error) {
      console.error('NVIDIA API call failed:', error)
      keyManager.markFailure()
      attempts++

      if (attempts >= maxAttempts) {
        throw new Error(`All NVIDIA API keys exhausted after ${maxAttempts} attempts`)
      }
    }
  }

  throw new Error('Failed to get response from NVIDIA API after all fallback attempts')
}

// ============================================================================
// Environment Variable Setup Instructions
// ============================================================================

/*
Add these to your .env.local file:

# NVIDIA API Keys (up to 4 for fallback)
NEXT_PUBLIC_NVIDIA_API_KEY_1=your-first-api-key-here
NEXT_PUBLIC_NVIDIA_API_KEY_2=your-second-api-key-here
NEXT_PUBLIC_NVIDIA_API_KEY_3=your-third-api-key-here
NEXT_PUBLIC_NVIDIA_API_KEY_4=your-fourth-api-key-here

# Fallback to single key if needed
NEXT_PUBLIC_NVIDIA_API_KEY=your-fallback-key

The system will automatically:
1. Use the first key by default
2. Rotate to the next key after 3 failures
3. Try different models as secondary fallback
4. Track which key is currently active
*/