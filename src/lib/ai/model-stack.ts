/**
 * HASEx Cognitive Stack - Optimized Model Routing
 * Based on Quality, Reasoning, Personality Fit, Long Context, and Reliability
 * 
 * Model Routing Philosophy:
 * - Nemotron 550B: Agentic Interrogator (probing, intense, strategic)
 * - DeepSeek V4: Logic Architect (precise, objective, hierarchical)
 * - Mistral 675B: Sophisticated Peer (refined, challenging, stable)
 * - Kimi K2.6: Mindful Mirror (direct, calm, focused)
 * - MiniMax M2.7: Pattern Synth (analytical, intuitive, self-evolving)
 */

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
  /**
   * Destination Interview
   * Objective: Probing the user's "Why," defining success, and identifying necessary sacrifices.
   * Best Model: Nemotron 550B - The Agentic Interrogator
   */
  destinationInterview: {
    primary: { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.7, max_tokens: 1024 },
    fallbacks: [
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.7, max_tokens: 1024 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.7, max_tokens: 1024 },
      { model: 'mistralai/mistral-2512', temperature: 0.7, max_tokens: 1024 },
    ],
  },

  /**
   * Roadmap Generation
   * Objective: Deconstructing high-level goals into Phases, Stages, and Tasks.
   * Best Model: DeepSeek V4 Pro - The Logic Architect
   */
  roadmapGeneration: {
    primary: { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.5, max_tokens: 2048 },
    fallbacks: [
      { model: 'kimi-a/kimi-k2.6', temperature: 0.5, max_tokens: 2048 },
      { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.5, max_tokens: 2048 },
      { model: 'nvidia/minimaxai/minimax-m2.7', temperature: 0.5, max_tokens: 2048 },
    ],
  },

  /**
   * AI Chat
   * Objective: Long-term, reflective, intelligent, and non-judgmental dialogue.
   * Best Model: Nemotron 550B - NVIDIA's best for RAG with long context
   * - Excellent reasoning and context understanding
   * - Optimized for multi-turn conversations
   * - Best-in-class for retrieval-augmented generation
   */
  aiChat: {
    primary: { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.7, max_tokens: 1024 },
    fallbacks: [
      { model: 'mistralai/mistral-2512', temperature: 0.7, max_tokens: 1024 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.7, max_tokens: 1024 },
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.7, max_tokens: 1024 },
    ],
  },

  /**
   * Home Reflections
   * Objective: Direct, calm, and honest daily check-ins.
   * Best Model: Kimi K2.6 - The Mindful Mirror
   */
  homeReflections: {
    primary: { model: 'kimi-a/kimi-k2.6', temperature: 0.4, max_tokens: 512 },
    fallbacks: [
      { model: 'mistralai/mistral-2512', temperature: 0.4, max_tokens: 512 },
      { model: 'nvidia/minimaxai/minimax-m2.7', temperature: 0.4, max_tokens: 512 },
      { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.4, max_tokens: 512 },
    ],
  },

  /**
   * Complex Decisions
   * Objective: Strategic reasoning for high-stakes pivots.
   * Best Model: Nemotron 550B - The Master Strategist
   */
  complexDecisions: {
    primary: { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.6, max_tokens: 1536 },
    fallbacks: [
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.6, max_tokens: 1536 },
      { model: 'mistralai/mistral-2512', temperature: 0.6, max_tokens: 1536 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.6, max_tokens: 1536 },
    ],
  },

  /**
   * Memory Summarization
   * Objective: Compressing months of data into actionable patterns and identity traits.
   * Best Model: MiniMax M2.7 - The Pattern Synth
   */
  memorySummarization: {
    primary: { model: 'nvidia/minimaxai/minimax-m2.7', temperature: 0.5, max_tokens: 1024 },
    fallbacks: [
      { model: 'mistralai/mistral-2512', temperature: 0.5, max_tokens: 1024 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.5, max_tokens: 1024 },
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.5, max_tokens: 1024 },
    ],
  },

  /**
   * Goal Validation
   * Objective: Quick validation of goal quality and feasibility.
   * Best Model: Nemotron 550B - Probing & Intense
   */
  goalValidation: {
    primary: { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.3, max_tokens: 256 },
    fallbacks: [
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.3, max_tokens: 256 },
      { model: 'mistralai/mistral-2512', temperature: 0.3, max_tokens: 256 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.3, max_tokens: 256 },
    ],
  },

  /**
   * Goal Refinement
   * Objective: Iterative improvement of goals based on feedback.
   * Best Model: DeepSeek V4 - Precise & Objective
   */
  goalRefinement: {
    primary: { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.5, max_tokens: 512 },
    fallbacks: [
      { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.5, max_tokens: 512 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.5, max_tokens: 512 },
      { model: 'mistralai/mistral-2512', temperature: 0.5, max_tokens: 512 },
    ],
  },

  /**
   * Action Generation
   * Objective: Creating concrete, daily actionable steps.
   * Best Model: Kimi K2.6 - Direct & Focused
   */
  actionGeneration: {
    primary: { model: 'kimi-a/kimi-k2.6', temperature: 0.6, max_tokens: 1024 },
    fallbacks: [
      { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.6, max_tokens: 1024 },
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.6, max_tokens: 1024 },
      { model: 'mistralai/mistral-2512', temperature: 0.6, max_tokens: 1024 },
    ],
  },

  /**
   * Insight Generation
   * Objective: Generating deep insights from patterns and behaviors.
   * Best Model: MiniMax M2.7 - Analytical & Intuitive
   */
  insightGeneration: {
    primary: { model: 'nvidia/minimaxai/minimax-m2.7', temperature: 0.5, max_tokens: 512 },
    fallbacks: [
      { model: 'nvidia/nemotron-3-ultra-550b-a55b', temperature: 0.5, max_tokens: 512 },
      { model: 'deepseek-ai/DeepSeek-V4', temperature: 0.5, max_tokens: 512 },
      { model: 'kimi-a/kimi-k2.6', temperature: 0.5, max_tokens: 512 },
    ],
  },
} as const

export type TaskType = keyof typeof MODEL_STACK

// Cognitive Stack Summary
export const COGNITIVE_STACK = {
  agenticInterrogator: 'nvidia/nemotron-3-ultra-550b-a55b',
  logicArchitect: 'deepseek-ai/DeepSeek-V4',
  sophisticatedPeer: 'mistralai/mistral-2512',
  mindfulMirror: 'kimi-a/kimi-k2.6',
  patternSynth: 'nvidia/minimaxai/minimax-m2.7',
} as const