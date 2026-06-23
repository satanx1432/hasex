import { GenerateActionRequest, GenerateActionResponse, FeedbackAnalysisRequest, FeedbackAnalysisResponse } from '@/types'
import { MODEL_STACK, ModelConfig } from './model-stack'

const NVIDIA_NIM_ENDPOINT = process.env.NVIDIA_NIM_ENDPOINT || 'https://integrate.api.nvidia.com/v1'
const NVIDIA_NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY

export class NVIDIANIMService {
  isConfigured(): boolean {
    return !!(NVIDIA_NIM_API_KEY && NVIDIA_NIM_API_KEY.length > 0)
  }

  private async makeRequestWithFallback(
    configs: ModelConfig[],
    messages: any[],
    timeout: number = 30000
  ): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await this.makeRequest(
        configs[0].model,
        messages,
        configs[0].temperature,
        configs[0].max_tokens
      )
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  public async makeRequest(
    model: string,
    messages: any[],
    temperature = 0.7,
    maxTokens = 1024
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('NVIDIA NIM API key is not configured. Add NVIDIA_NIM_API_KEY to your environment variables.')
    }

    const response = await fetch(`${NVIDIA_NIM_ENDPOINT}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      if (response.status === 401) {
        throw new Error('Invalid NVIDIA NIM API key. Check your credentials.')
      }
      throw new Error(`NVIDIA NIM API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  async chat(request: {
    messages: { role: string; content: string }[]
    user_id: string
    context: { goal: string }
  }): Promise<{ message: string }> {
    const systemPrompt = `Helpful AI assistant. Be very concise. 1-2 sentences max.`

    const recentMessages = request.messages.slice(-3)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentMessages
    ]

    const response = await this.makeRequest(
      'meta/llama-3.1-8b-instruct',
      messages,
      0.7,
      128
    )
    return { message: response }
  }

  async generateInstantWinAction(goal: string): Promise<string> {
    if (!goal || goal.trim().length === 0) {
      throw new Error('A goal is required to generate an action.')
    }

    const messages = [
      {
        role: 'system',
        content: `You are a behavioral science expert specializing in micro-actions. Generate a single, small micro-action that is almost impossible to fail. Format as a simple "If-Then" statement. Keep it to one sentence.`,
      },
      {
        role: 'user',
        content: `Goal: "${goal}". Generate one instant-win micro-action.`,
      },
    ]

    const stack = MODEL_STACK.actionGeneration
    return this.makeRequestWithFallback([stack.primary, ...stack.fallbacks], messages)
  }

  async generateActionOptions(request: GenerateActionRequest): Promise<GenerateActionResponse> {
    if (!request.goal || request.goal.trim().length === 0) {
      throw new Error('A goal is required to generate action options.')
    }

    const { goal, user_history, context } = request

    const systemPrompt = `You are a behavioral science expert specializing in micro-actions and habit formation. Generate 3-5 highly personalized micro-action options. Each option must be:
1. Small and immediately actionable
2. Formatted as "If-Then" plans
3. Optimized for the user's context and history
4. Based on Fogg's Behavior Model and James Clear's Atomic Habits principles

Return a JSON response with this structure:
{
  "actions": [
    {
      "title": "Action Title",
      "description": "Brief description",
      "if_then_plan": "If [context], Then I will [action]",
      "difficulty_score": 1-10,
      "estimated_time_minutes": number
    }
  ],
  "recommended_action": index of recommended action,
  "reasoning": "Why this action is recommended"
}`

    const userPrompt = `Goal: "${goal}"
User History: ${JSON.stringify(user_history || {})}
Context: ${JSON.stringify(context || {})}

Generate 3-5 micro-action options.`

    const stack = MODEL_STACK.actionGeneration
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const response = await this.makeRequestWithFallback([stack.primary, ...stack.fallbacks], messages)
    const parsed = JSON.parse(response)

    const enrichedActions = parsed.actions.map((action: any, index: number) => ({
      ...action,
      id: index.toString(),
      goal_id: '',
      user_id: '',
      created_at: new Date().toISOString(),
      status: 'pending' as const
    }))

    return {
      ...parsed,
      actions: enrichedActions
    }
  }

  async refineAction(goal: string, currentAction: string, question1: string, question2: string): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: `You are a behavioral science expert. Generate a refined micro-action based on user answers to clarification questions. The refined action must be contextually anchored and maximally easy.`,
      },
      {
        role: 'user',
        content: `Goal: "${goal}"
Current action: "${currentAction}"
Q1: "${question1}"
Q2: "${question2}"

Generate a refined, contextually anchored micro-action.`,
      },
    ]

    const stack = MODEL_STACK.actionGeneration
    return this.makeRequestWithFallback([stack.primary, ...stack.fallbacks], messages)
  }

  async analyzeFeedback(request: FeedbackAnalysisRequest): Promise<FeedbackAnalysisResponse> {
    const { feedback, action_id, user_state } = request

    const systemPrompt = `You are a behavioral science expert specializing in behavioral inference and adaptation. Analyze user feedback to understand:
1. Sentiment (positive/neutral/negative)
2. Barriers that prevented action completion
3. Facilitators that helped action completion
4. Suggested adjustments for future actions

Return a JSON response with this structure:
{
  "sentiment": "positive|neutral|negative",
  "barrier_categories": ["category1", "category2"],
  "facilitator_categories": ["category1", "category2"],
  "suggested_adjustments": ["adjustment1", "adjustment2"],
  "motivational_message": "Brief encouraging message"
}`

    const userPrompt = `Feedback: "${feedback}"
User State: ${JSON.stringify(user_state || {})}

Analyze this feedback.`

    const stack = MODEL_STACK.insightGeneration
    const response = await this.makeRequestWithFallback(
      [stack.primary, ...stack.fallbacks],
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]
    )

    return JSON.parse(response)
  }

  async generateInsight(
    userId: string,
    insightType: 'motivational' | 'behavioral' | 'progress' | 'intervention',
    userData: any
  ): Promise<{ title: string; content: string; actionable_suggestion?: string }> {
    const systemPrompt = `You are a behavioral science expert specializing in personalized insights. Generate a ${insightType} insight based on user data. The insight should be:
1. Highly relevant and personalized
2. Direct and factual
3. Action-oriented
4. Based on behavioral science principles

Return a JSON response with this structure:
{
  "title": "Insight Title",
  "content": "Detailed insight content",
  "actionable_suggestion": "Specific suggestion (optional)"
}`

    const userPrompt = `User Data: ${JSON.stringify(userData)}
Generate a ${insightType} insight.`

    const stack = MODEL_STACK.insightGeneration
    const response = await this.makeRequestWithFallback(
      [stack.primary, ...stack.fallbacks],
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]
    )

    return JSON.parse(response)
  }

  async calibrateNextAction(
    previousAction: any,
    completionData: any,
    userProfile: any
  ): Promise<any> {
    const systemPrompt = `You are a behavioral science expert specializing in dynamic action calibration. Based on previous action performance, calibrate the next action to:
1. Be appropriately challenging
2. Address any barriers encountered
3. Leverage any facilitators identified

Return a JSON response with calibration recommendations.`

    const userPrompt = `Previous Action: ${JSON.stringify(previousAction)}
Completion Data: ${JSON.stringify(completionData)}
User Profile: ${JSON.stringify(userProfile)}

Calibrate the next action.`

    const stack = MODEL_STACK.complexDecisions
    const response = await this.makeRequestWithFallback(
      [stack.primary, ...stack.fallbacks],
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]
    )

    return JSON.parse(response)
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isConfigured()) {
      throw new Error('NVIDIA NIM API key is not configured.')
    }

    const response = await fetch(`${NVIDIA_NIM_ENDPOINT}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'nvidia/llama-3.3-nemotron-super-49b-a16k-instruct',
        input: texts,
      }),
    })

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.map((d: any) => d.embedding)
  }

  async interviewUser(goal: string): Promise<string> {
    const systemPrompt = `You are a skilled interviewer probing the user's deeper motivations. Ask ONE question at a time to understand:
- Why this goal matters to them
- What they're willing to sacrifice
- What success looks like
- What obstacles they've faced

Be direct, challenging, and don't accept superficial answers. Dig deeper.`

    const stack = MODEL_STACK.destinationInterview
    return this.makeRequestWithFallback(
      [stack.primary, ...stack.fallbacks],
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `The user's goal is: "${goal}". Start the interview with the most critical question.` }
      ]
    )
  }

  async generateRoadmap(goal: string, context: any): Promise<any> {
    const systemPrompt = `You are a Logic Architect. Generate a hierarchical roadmap with:
- Phases (high-level milestones)
- Stages (within each phase)
- Tasks (specific daily actions)

Make it granular, logically sound, and non-redundant.`

    const stack = MODEL_STACK.roadmapGeneration
    const response = await this.makeRequestWithFallback(
      [stack.primary, ...stack.fallbacks],
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Goal: "${goal}"\nContext: ${JSON.stringify(context)}\nGenerate a detailed roadmap.` }
      ]
    )

    return JSON.parse(response)
  }

  async reflectOnDay(userId: string, dayData: any): Promise<string> {
    const stack = MODEL_STACK.homeReflections
    const messages = [
      { role: 'system', content: `You are a Mindful Mirror. Provide direct, calm, honest daily check-ins. Be brief. No fluff.` },
      { role: 'user', content: `User ID: ${userId}\nDay Data: ${JSON.stringify(dayData)}\nProvide a reflection on their day.` }
    ]

    return this.makeRequestWithFallback([stack.primary, ...stack.fallbacks], messages)
  }

  async analyzeMemoryPattern(memoryData: any): Promise<string> {
    const stack = MODEL_STACK.memorySummarization
    const messages = [
      { role: 'system', content: `You are a Pattern Synth. Identify unseen behavioral patterns. Connect the dots. Make it actionable.` },
      { role: 'user', content: `Memory Data: ${JSON.stringify(memoryData)}\nIdentify patterns and synthesize insights.` }
    ]

    return this.makeRequestWithFallback([stack.primary, ...stack.fallbacks], messages)
  }
}

export const nvidiaNIMService = new NVIDIANIMService()