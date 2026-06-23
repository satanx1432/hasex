export interface ModelConfig {
  model: string
  temperature: number
  max_tokens: number
}

export interface ModelWithFallback {
  primary: ModelConfig
  fallbacks: ModelConfig[]
}

export const MODEL_STACK = {
  destinationInterview: {
    primary: { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.7, max_tokens: 1024 },
    fallbacks: [
      { model: 'deepseek-ai/DeepSeek-V4-Pro', temperature: 0.7, max_tokens: 1024 },
      { model: 'kimi-a-kimi-k2.6', temperature: 0.7, max_tokens: 1024 },
      { model: 'mistralai/mistral-2512', temperature: 0.7, max_tokens: 1024 },
    ],
  },
  
  roadmapGeneration: {
    primary: { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.5, max_tokens: 2048 },
    fallbacks: [
      { model: 'kimi-a/kimi-k2.6', temperature: 0.5, max_tokens: 2048 },
      { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.5, max_tokens: 2048 },
      { model: 'mistralai/mistral-2512', temperature: 0.5, max_tokens: 2048 },
    ],
  },
  
  aiChat: {
    primary: { model: 'meta/llama-3.1-8b-instruct', temperature: 0.7, max_tokens: 256 },
    fallbacks: [],
  },
  
  homeReflections: {
    primary: { model: 'kimi-a/kimi-k2.6', temperature: 0.4, max_tokens: 512 },
    fallbacks: [
      { model: 'mistralai/mistral-2512', temperature: 0.4, max_tokens: 512 },
      { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.4, max_tokens: 512 },
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.4, max_tokens: 512 },
    ],
  },
  
  complexDecisions: {
    primary: { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.6, max_tokens: 1536 },
    fallbacks: [
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.6, max_tokens: 1536 },
      { model: 'mistralai/mistral-2512', temperature: 0.6, max_tokens: 1536 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.6, max_tokens: 1536 },
    ],
  },
  
  memorySummarization: {
    primary: { model: 'nvidia/minimaxai/minimax-m2.7', temperature: 0.5, max_tokens: 1024 },
    fallbacks: [
      { model: 'mistralai/mistral-2512', temperature: 0.5, max_tokens: 1024 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.5, max_tokens: 1024 },
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.5, max_tokens: 1024 },
    ],
  },
  
  goalValidation: {
    primary: { model: 'meta/llama-3.1-8b-instruct', temperature: 0.3, max_tokens: 256 },
    fallbacks: [
      { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.3, max_tokens: 256 },
      { model: 'mistralai/mistral-2512', temperature: 0.3, max_tokens: 256 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.3, max_tokens: 256 },
    ],
  },
  
  goalRefinement: {
    primary: { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.5, max_tokens: 512 },
    fallbacks: [
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.5, max_tokens: 512 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.5, max_tokens: 512 },
      { model: 'mistralai/mistral-2512', temperature: 0.5, max_tokens: 512 },
    ],
  },
  
  actionGeneration: {
    primary: { model: 'moonshotai/kimi-k2-6', temperature: 0.6, max_tokens: 1024 },
    fallbacks: [
      { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.6, max_tokens: 1024 },
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.6, max_tokens: 1024 },
      { model: 'mistralai/mistral-2512', temperature: 0.6, max_tokens: 1024 },
    ],
  },
  
  insightGeneration: {
    primary: { model: 'moonshotai/kimi-k2-6', temperature: 0.5, max_tokens: 512 },
    fallbacks: [
      { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.5, max_tokens: 512 },
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.5, max_tokens: 512 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.5, max_tokens: 512 },
    ],
  },
} as const

export type TaskType = keyof typeof MODEL_STACK