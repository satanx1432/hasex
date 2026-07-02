import { NextRequest, NextResponse } from 'next/server'
import { nvidiaNIMService } from '@/lib/ai/nvidia-nim'
import { groqService } from '@/lib/ai/groq'

const NVIDIA_TIMEOUT = 30000

interface ModelConfig {
  model: string
  temperature: number
  max_tokens: number
}

async function tryNVIDIA(messages: any[], config: ModelConfig): Promise<string> {
  try {
    return await nvidiaNIMService.makeRequest(
      config.model,
      messages,
      config.temperature,
      config.max_tokens
    )
  } catch (error) {
    console.warn('NVIDIA NIM failed:', error)
    throw error
  }
}

async function tryGroq(messages: any[], config: ModelConfig): Promise<string> {
  if (!groqService.isConfigured()) {
    throw new Error('Groq is not configured')
  }
  return await groqService.chat(
    messages,
    'llama-3.3-70b-versatile',
    config.temperature,
    config.max_tokens
  )
}

async function chatWithFallback(
  messages: any[],
  config: { model?: string; temperature?: number; max_tokens?: number } = {}
): Promise<string> {
  const cfg = {
    model: config.model || 'meta/llama-3.1-8b-instruct',
    temperature: config.temperature || 0.7,
    max_tokens: config.max_tokens || 1024
  }

  if (nvidiaNIMService.isConfigured()) {
    try {
      return await Promise.race([
        tryNVIDIA(messages, cfg),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('NVIDIA NIM timeout')), NVIDIA_TIMEOUT)
        )
      ])
    } catch (error) {
      console.warn('NVIDIA failed, trying Groq:', error)
      if (groqService.isConfigured()) {
        return await tryGroq(messages, cfg)
      }
      throw error
    }
  } else if (groqService.isConfigured()) {
    return await tryGroq(messages, cfg)
  }
  throw new Error('No AI service configured')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, messages, prompt, context, model: modelOverride } = body

    if (!nvidiaNIMService.isConfigured() && !groqService.isConfigured()) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    let response: string

    if (action === 'chat' && messages) {
      response = await chatWithFallback(messages, { model: modelOverride })
      return NextResponse.json({ message: response })
    }

    if (action === 'generateInsight' && prompt) {
      const systemPrompt = `You are a behavioral science expert specializing in personalized coaching. Analyze user data and provide direct, actionable insights. Avoid fluff. Focus on what matters most.`
      
      response = await chatWithFallback([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ], { temperature: 0.5, max_tokens: 512 })
      
      return NextResponse.json({ insight: response })
    }

    if (action === 'generateAction') {
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

      const userPrompt = prompt || 'Generate micro-actions for the goal'
      response = await chatWithFallback([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { temperature: 0.7, max_tokens: 2048 })

      return NextResponse.json(JSON.parse(response))
    }

    if (action === 'interview') {
      response = await chatWithFallback(messages || [
        { role: 'system', content: 'You are a skilled interviewer probing the user deeper motivations.' },
        { role: 'user', content: prompt || 'Start the interview' }
      ], { temperature: 0.7, max_tokens: 512 })

      return NextResponse.json({ message: response })
    }

    if (action === 'roadmap') {
      response = await chatWithFallback(messages || [
        { role: 'system', content: 'You are a Logic Architect. Generate a hierarchical roadmap with Phases, Stages, and Tasks.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.7, max_tokens: 4096 })

      return NextResponse.json(JSON.parse(response))
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    nvidiaConfigured: nvidiaNIMService.isConfigured(),
    groqConfigured: groqService.isConfigured()
  })
}