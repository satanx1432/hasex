/**
 * Initial User Flow for New Goals
 * 
 * Implements the exact flow specified:
 * 1. User enters goal
 * 2. Ask ONLY: "How much time can you realistically commit each week, and what resources do you already have?"
 * 3. Route to GLM 5.1 to infer destination, bottlenecks, milestones, action, success probability, profile
 */

import { createClient } from '../supabase/client'
import { routeForNewGoal, ModelType } from './model-router'
import { nvidiaNIMService } from './nvidia-nim'
import { validateGoal } from '../goal-validation'
import { spellCorrectionEngine } from '../spell-correction'

export interface NewGoalInput {
  goal: string
  weekly_time_commitment?: string
  existing_resources?: string
}

export interface GoalAnalysisResult {
  destination: {
    main_goal: string
    why_it_matters: string
    current_stage: string
    next_milestone: string
    success_probability: number
  }
  todays_action: string
  profile: {
    motivation: string
    strengths: string[]
    weaknesses: string[]
    biggest_bottleneck: string
    coaching_style: string
  }
  model_used: ModelType
  confidence: number
}

export class GoalFlowManager {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  /**
   * Step 1: User enters goal
   * Returns: The question to ask next or validation result if confidence is high
   */
  async handleGoalEntry(goal: string): Promise<{
    next_question?: string
    validation_result?: any
    stored_goal: string
    needs_intent_confirmation?: boolean
    intent_suggestions?: any[]
  }> {
    // Validate goal using Llama 3.2 1B
    const validation = await validateGoal(goal)

    // Normalize goal for storage
    const normalizedGoal = spellCorrectionEngine.normalizeGoalForStorage(validation.interpreted_goal || goal)

    // If needs intent confirmation, return suggestions
    if (validation.needs_intent_confirmation) {
      return {
        validation_result: validation,
        stored_goal: normalizedGoal,
        needs_intent_confirmation: true,
        intent_suggestions: validation.intent_suggestions
      }
    }

    // If confidence is high enough and doesn't need followup, we can proceed
    if (validation.valid && (validation.confidence ?? 0) >= 70 && !validation.needs_followup) {
      return {
        validation_result: validation,
        stored_goal: normalizedGoal
      }
    }

    // If validation fails, show error
    if (!validation.valid) {
      return {
        next_question: validation.reasoning || 'Please try rephrasing your goal.',
        stored_goal: normalizedGoal
      }
    }

    // If needs followup (low confidence), ask the single question
    if (validation.needs_followup || (validation.confidence ?? 0) < 70) {
      return {
        next_question: validation.followup_question || "How much time can you realistically commit each week, and what resources do you already have?",
        stored_goal: normalizedGoal
      }
    }

    // Default: ask the followup question
    return {
      next_question: "How much time can you realistically commit each week, and what resources do you already have?",
      stored_goal: normalizedGoal
    }
  }

  /**
   * Step 2: User provides time and resources
   * Step 3: Route to GLM 5.1 for analysis
   */
  async processCompleteGoalEntry(input: NewGoalInput, conversationHistory: any[], validationResult?: any): Promise<GoalAnalysisResult> {
    try {
      // If no validation result provided, validate first
      let validation = validationResult
      if (!validation) {
        validation = await validateGoal(input.goal)
      }

      // If validation is invalid, return error
      if (!validation.valid) {
        return {
          destination: {
            main_goal: '',
            why_it_matters: '',
            current_stage: '',
            next_milestone: '',
            success_probability: 0
          },
          todays_action: '',
          profile: {
            motivation: '',
            strengths: [],
            weaknesses: [],
            biggest_bottleneck: '',
            coaching_style: ''
          },
          model_used: 'QWEN_3_5_397B',
          confidence: 0
        }
      }

      // If still needs followup, we can't proceed yet
      if (validation.needs_followup) {
        throw new Error('Need user to provide time and resources before analysis')
      }

      // Route to appropriate model (should be GLM 5.1 for new goals)
      const routingDecision = routeForNewGoal(conversationHistory)

      // Use the selected model for analysis
      const analysis = await this.analyzeGoalWithModel(input, routingDecision.selected_model, validation)

      // Store the goal in database (use the normalized/interpreted goal)
      const normalizedGoal = spellCorrectionEngine.normalizeGoalForStorage(validation.interpreted_goal || input.goal)
      await this.storeGoal(normalizedGoal, analysis)

      return {
        ...analysis,
        model_used: routingDecision.selected_model,
        confidence: routingDecision.confidence
      }
    } catch (error) {
      console.error('Error processing goal entry:', error)
      throw error
    }
  }

  /**
   * Analyze goal with the selected model (GLM 5.1 by default for new goals)
   */
  private async analyzeGoalWithModel(input: NewGoalInput, model: ModelType, validation?: any): Promise<Omit<GoalAnalysisResult, 'model_used' | 'confidence'>> {
    const systemPrompt = this.buildSystemPrompt(input, model, validation)
    const userPrompt = this.buildUserPrompt(input, validation)

    const response = await this.callModel(model, systemPrompt, userPrompt)

    return this.parseAnalysisResponse(response)
  }

  /**
   * Build system prompt based on model and input
   */
  private buildSystemPrompt(input: NewGoalInput, model: ModelType, validation?: any): string {
    const basePrompt = `You are an AI execution coach. Help users transform goals into systems and systems into actions.

Current Input:
- Original Goal: "${input.goal}"
- Interpreted Goal: "${validation?.interpreted_goal || input.goal}"
- Goal Type: ${validation?.goal_type || 'UNKNOWN'}
- Validation Confidence: ${validation?.confidence || 50}%
- Weekly time commitment: ${input.weekly_time_commitment}
- Existing resources: ${input.existing_resources}

Your task is to infer:
1. User's true destination
2. Why they want it
3. Likely bottlenecks
4. First milestone
5. Today's highest leverage action
6. Success probability (0-100)
7. Initial profile (motivation, strengths, weaknesses, biggest bottleneck, coaching style)

DO NOT:
- Ask more questions
- Give generic advice
- Create surveys
- Force templates

DO:
- Infer intelligently
- Give value immediately
- Focus on action
- Adapt to the user
- Make the user feel understood

Return ONLY valid JSON in this format:
{
  "destination": {
    "main_goal": "string",
    "why_it_matters": "string",
    "current_stage": "string",
    "next_milestone": "string",
    "success_probability": number
  },
  "todays_action": "string",
  "profile": {
    "motivation": "string",
    "strengths": ["string", "string"],
    "weaknesses": ["string", "string"],
    "biggest_bottleneck": "string",
    "coaching_style": "string"
  }
}`

    return basePrompt
  }

  /**
   * Build user prompt for the model
   */
  private buildUserPrompt(input: NewGoalInput, validation?: any): string {
    return `Analyze this goal entry and provide the structured analysis:
Original Goal: ${input.goal}
Interpreted Goal: ${validation?.interpreted_goal || input.goal}
Goal Type: ${validation?.goal_type || 'UNKNOWN'}
Time commitment: ${input.weekly_time_commitment}
Resources: ${input.existing_resources}

Focus on the immediate next action and make the user feel understood. The AI validator has already interpreted the user's intent, so work with that understanding.`
  }

  /**
   * Call the appropriate AI model
   */
  private async callModel(model: ModelType, systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      // Map our model types to actual NVIDIA NIM model names
      let modelName: string
      switch (model) {
        case 'QWEN_3_5_397B':
          modelName = 'qwen/qwen3.5-397b-a17b'
          break
        case 'KIMI_K2_6':
          modelName = 'moonshotai/kimi-k2-6'
          break
        case 'NEMOTRON_550B':
          modelName = 'nvidia/llama-3.1-nemotron-70b-instruct'
          break
        default:
          modelName = 'qwen/qwen3.5-397b-a17b'
      }

      const { nvidiaNIMService } = await import('./nvidia-nim')
      const response = await nvidiaNIMService.makeRequest(modelName, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.7)

      return response || ''
    } catch (error) {
      console.error('Error calling AI model:', error)
      throw error
    }
  }

  /**
   * Parse the model's JSON response
   */
  private parseAnalysisResponse(response: string): Omit<GoalAnalysisResult, 'model_used' | 'confidence'> {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        destination: parsed.destination,
        todays_action: parsed.todays_action,
        profile: parsed.profile
      }
    } catch (error) {
      console.error('Error parsing analysis response:', error)
      // Return default/fallback analysis
      return this.getFallbackAnalysis()
    }
  }

  /**
   * Fallback analysis if AI fails
   */
  private getFallbackAnalysis(): Omit<GoalAnalysisResult, 'model_used' | 'confidence'> {
    return {
      destination: {
        main_goal: "User's goal",
        why_it_matters: "Personal growth and achievement",
        current_stage: "Starting",
        next_milestone: "First action step",
        success_probability: 50
      },
      todays_action: "Start with a small, achievable action today",
      profile: {
        motivation: "Personal growth",
        strengths: ["Motivated", "Ambitious"],
        weaknesses: ["Needs structure"],
        biggest_bottleneck: "Getting started",
        coaching_style: "encouragement"
      }
    }
  }

  /**
   * Store the goal in database
   */
  private async storeGoal(goal: string, analysis: Omit<GoalAnalysisResult, 'model_used' | 'confidence'>): Promise<void> {
    try {
      const { data: userData } = await this.supabase.auth.getUser()
      
      const { data: goalData } = await this.supabase
        .from('goals')
        .insert({
          user_id: userData.user.id,
          title: analysis.destination.main_goal,
          description: analysis.destination.why_it_matters,
          status: 'active',
          deadline: null,
          success_criteria: [],
          metadata: {
            current_stage: analysis.destination.current_stage,
            next_milestone: analysis.destination.next_milestone,
            success_probability: analysis.destination.success_probability,
            todays_action: analysis.todays_action,
            profile: analysis.profile
          }
        })
        .select()
        .single()

      // Create first daily mission
      await this.supabase
        .from('daily_missions')
        .insert({
          user_id: userData.user.id,
          title: analysis.todays_action,
          description: analysis.destination.next_milestone,
          goal_id: goalData.id,
          status: 'pending',
          importance: 100,
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })

    } catch (error) {
      console.error('Error storing goal:', error)
      // Don't throw - goal analysis is still valuable even if storage fails
    }
  }
}

export const goalFlowManager = new GoalFlowManager()

/**
 * Convenience functions for the flow
 */
export async function startNewGoal(goal: string) {
  return goalFlowManager.handleGoalEntry(goal)
}

export async function completeGoalEntry(input: NewGoalInput, conversationHistory: any[]) {
  return goalFlowManager.processCompleteGoalEntry(input, conversationHistory)
}
