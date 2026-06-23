import { NextRequest, NextResponse } from 'next/server'
import { nvidiaNIMService } from '@/lib/ai/nvidia-nim'

export async function GET() {
  const isConfigured = nvidiaNIMService.isConfigured()
  return NextResponse.json({ isConfigured })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, user_id, context } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    if (!nvidiaNIMService.isConfigured()) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    const response = await nvidiaNIMService.chat({
      messages,
      user_id: user_id || 'guest',
      context: context || { goal: '' }
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}