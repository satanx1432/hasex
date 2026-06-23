'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isApiConfigured, setIsApiConfigured] = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    checkApiConfiguration()
    scrollToBottom()
  }, [messages])

  const checkApiConfiguration = async () => {
    try {
      const res = await fetch('/api/chat')
      const data = await res.json()
      setIsApiConfigured(data.isConfigured)
    } catch {
      setIsApiConfigured(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!input.trim() || !isApiConfigured) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const allMessages = messages.map(m => ({ role: m.role, content: m.content })).concat([{ role: 'user', content: input.trim() }])

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          user_id: user?.id || 'guest',
          context: { goal: sessionStorage.getItem('userGoal') || '' }
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err: any) {
      setError(err.message || 'Failed to get response. Please try again.')
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${err.message || 'Something went wrong'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  if (isApiConfigured === false) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="px-4 py-4 border-b border-border flex-shrink-0">
          <div className="max-w-[750px] mx-auto">
            <h1 className="text-xl font-semibold text-primary">AI Chat</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-4" data-icon="cloud_off">cloud_off</span>
            <h2 className="text-headline-md text-headline-md text-primary mb-2">AI Not Configured</h2>
            <p className="text-body-md text-body-md text-on-surface-variant mb-6">
              Add your NVIDIA NIM API key to enable AI chat. Without an API key, no AI responses can be generated.
            </p>
            <div className="text-left bg-surface border border-border p-4 mb-6">
              <p className="font-label-mono text-label-mono text-on-surface-variant mb-2">Setup:</p>
              <ol className="text-body-sm text-body-sm text-on-surface list-decimal list-inside space-y-1">
                <li>Get an NVIDIA NIM API key from developer.nvidia.com</li>
                <li>Add <code className="bg-surface-container-low px-1">NVIDIA_NIM_API_KEY</code> to your <code className="bg-surface-container-low px-1">.env.local</code></li>
                <li>Add <code className="bg-surface-container-low px-1">NVIDIA_NIM_ENDPOINT</code> if using a custom endpoint</li>
                <li>Restart the dev server</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="px-4 py-4 border-b border-border flex-shrink-0">
        <div className="max-w-[750px] mx-auto">
          <h1 className="text-xl font-semibold text-primary">AI Chat</h1>
          <p className="text-sm text-on-surface-variant">Your long-term thinking partner</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[750px] mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-on-surface-variant text-4xl mb-4" data-icon="chat">chat</span>
              <h2 className="text-headline-md text-headline-md text-primary mb-2">Start a conversation</h2>
              <p className="text-body-md text-body-md text-on-surface-variant">
                Ask about your goals, progress, or challenges. A goal must be set to use AI chat.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id}>
                  {message.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[70%] bg-surface border border-border px-4 py-3">
                        <p className="text-body-sm text-body-sm text-primary whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[700px]">
                      <div className="text-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
                        {message.content.startsWith('Error:') ? (
                          <span className="text-on-surface-variant">{message.content}</span>
                        ) : (
                          message.content
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 py-4">
              <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-on-surface-variant">Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border bg-background flex-shrink-0">
        <div className="max-w-[750px] mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about your goals or progress..."
              className="flex-1 bg-surface border border-border focus:border-border-light text-primary px-4 py-3 text-body-md placeholder:text-on-surface-variant focus:outline-none"
              disabled={isLoading || !isApiConfigured}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading || !isApiConfigured}
              className="px-4 py-3 bg-primary text-background font-label-mono text-label-mono uppercase tracking-widest hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer rounded-2xl"
              aria-label="Send message"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}