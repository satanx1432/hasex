/**
 * HASEx Model Selection System
 * 
 * Following the HASEx Model Selection Report for optimal model routing
 * across different AI tasks and fallback scenarios.
 */

export type ModelTask = 
  | 'interview'           // Destination Interview
  | 'roadmap'            // Roadmap Generation
  | 'chat'               // AI Chat
  | 'reflection'         // Home Reflections
  | 'complex_decision'   // Complex Decisions
  | 'memory_summary'     // Memory Summarization
  | 'stage_intervention' // Stage Skip/Change Intervention

export type ModelFallback = 0 | 1 | 2 | 3

export interface ModelConfig {
  primary: string
  fallback1: string
  fallback2: string
  fallback3: string
}

/**
 * Core Directives for Stage Skip/Change Intervention:
 * 1. Persona: The "Strategic Auditor"
 * 2. Primary Stakeholder: The user's Future Self who has already succeeded
 * 3. The "Non-Negotiable": Never shame. Use "Risk" as a logical metric, not a moral failure
 * 4. The Recommendation: Must be a direct nudge (Keep/Shorten/Replace/Skip) based on the Future Self statement
 */
export const MODEL_CONFIGS: Record<ModelTask, ModelConfig> = {
  // Destination Interview: Nemotron 550B (The Agentic Interrogator)
  interview: {
    primary: 'Nemotron 550B',
    fallback1: 'DeepSeek V4 Pro',
    fallback2: 'Qwen3.5-397B',
    fallback3: 'Mistral 675B'
  },
  
  // Roadmap Generation: DeepSeek V4 Pro (The Logic Architect)
  roadmap: {
    primary: 'DeepSeek V4 Pro',
    fallback1: 'Qwen3.5-397B',
    fallback2: 'Nemotron 550B',
    fallback3: 'MiniMax M2.7'
  },
  
  // AI Chat: Mistral 675B (The Sophisticated Peer)
  chat: {
    primary: 'Mistral 675B (2512)',
    fallback1: 'Kimi K2.6',
    fallback2: 'MiniMax M2.7',
    fallback3: 'DeepSeek V4 Pro'
  },
  
  // Home Reflections: Kimi K2.6 (The Mindful Mirror)
  reflection: {
    primary: 'Kimi K2.6',
    fallback1: 'Mistral 675B',
    fallback2: 'MiniMax M2.7',
    fallback3: 'Qwen3.5-397B'
  },
  
  // Complex Decisions: Nemotron 550B (The Master Strategist)
  complex_decision: {
    primary: 'Nemotron 550B',
    fallback1: 'DeepSeek V4 Pro',
    fallback2: 'Mistral 675B',
    fallback3: 'Qwen3.5-397B'
  },
  
  // Memory Summarization: MiniMax M2.7 (The Pattern Synth)
  memory_summary: {
    primary: 'MiniMax M2.7',
    fallback1: 'Mistral 675B',
    fallback2: 'Kimi K2.6',
    fallback3: 'DeepSeek V4 Pro'
  },
  
  // Stage Skip/Change Intervention: Nemotron 550B (The Strategic Auditor)
  stage_intervention: {
    primary: 'Nemotron 550B',
    fallback1: 'Mistral 675B (2512)',
    fallback2: 'Kimi K2.6',
    fallback3: 'DeepSeek V4 Pro'
  }
}

/**
 * Get the recommended model for a specific task
 * @param task - The type of AI task
 * @param fallback - Fallback level (0 = primary, 1-3 = fallbacks)
 * @returns The model name to use
 */
export function getModelForTask(task: ModelTask, fallback: ModelFallback = 0): string {
  const config = MODEL_CONFIGS[task]
  
  switch (fallback) {
    case 0:
      return config.primary
    case 1:
      return config.fallback1
    case 2:
      return config.fallback2
    case 3:
      return config.fallback3
    default:
      return config.primary
  }
}

/**
 * Get the full model configuration for a task
 * @param task - The type of AI task
 * @returns The complete model configuration with fallbacks
 */
export function getModelConfig(task: ModelTask): ModelConfig {
  return MODEL_CONFIGS[task]
}

/**
 * Get model personality profile for a task
 * @param task - The type of AI task
 * @returns The personality traits the model should exhibit
 */
export function getModelPersonality(task: ModelTask): string {
  const personalities: Record<ModelTask, string> = {
    interview: 'Probing & Intense',
    roadmap: 'Precise & Objective',
    chat: 'Refined & Challenging',
    reflection: 'Direct & Calm',
    complex_decision: 'Wise & Interrogative',
    memory_summary: 'Analytical & Intuitive',
    stage_intervention: 'Strategic Auditor & Non-Judgmental'
  }
  
  return personalities[task]
}

/**
 * Get model core strength for a task
 * @param task - The type of AI task
 * @returns The core strength of the recommended model
 */
export function getModelStrength(task: ModelTask): string {
  const strengths: Record<ModelTask, string> = {
    interview: 'Agentic Persistence',
    roadmap: 'Hierarchical Logic',
    chat: 'Context Stability',
    reflection: 'Focused Observation',
    complex_decision: 'Strategic Depth',
    memory_summary: 'Pattern Recognition',
    stage_intervention: 'Strategic Auditing & Pattern Matching'
  }
  
  return strengths[task]
}

/**
 * Log model selection for debugging
 * @param task - The type of AI task
 * @param model - The model that was selected
 * @param fallback - Fallback level used
 */
export function logModelSelection(task: ModelTask, model: string, fallback: ModelFallback = 0): void {
  const fallbackLabel = fallback === 0 ? 'Primary' : `Fallback ${fallback}`
  console.log(`[HASEx Model Selection] Task: ${task} | Model: ${model} | Level: ${fallbackLabel}`)
  console.log(`  Strength: ${getModelStrength(task)}`)
  console.log(`  Personality: ${getModelPersonality(task)}`)
}

/**
 * Handle model failure and return fallback model
 * @param task - The type of AI task
 * @param currentFallback - Current fallback level
 * @returns The fallback model to use, or null if no more fallbacks available
 */
export function getModelFallback(task: ModelTask, currentFallback: ModelFallback = 0): string | null {
  const nextFallback = (currentFallback + 1) as ModelFallback
  
  if (nextFallback > 3) {
    console.error(`[HASEx Model Selection] No more fallbacks available for task: ${task}`)
    return null
  }
  
  const fallbackModel = getModelForTask(task, nextFallback)
  console.warn(`[HASEx Model Selection] Fallback triggered for task: ${task}. Using: ${fallbackModel}`)
  
  return fallbackModel
}
