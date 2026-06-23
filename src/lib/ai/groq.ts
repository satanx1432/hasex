const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GroqResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class GroqService {
  isConfigured(): boolean {
    return !!(GROQ_API_KEY && GROQ_API_KEY.length > 0)
  }

  async chat(
    messages: GroqMessage[],
    model: string = 'llama-3.3-70b-versatile',
    temperature: number = 0.7,
    maxTokens: number = 2048
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Groq API key is not configured. Add GROQ_API_KEY to your environment variables.')
    }

    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
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
        throw new Error('Groq API rate limit exceeded. Please try again later.')
      }
      if (response.status === 401) {
        throw new Error('Invalid Groq API key. Check your credentials.')
      }
      const error = await response.json()
      throw new Error(`Groq API error: ${error.error?.message || response.statusText}`)
    }

    const data: GroqResponse = await response.json()
    return data.choices[0]?.message?.content || ''
  }

  async researchContent(query: string, context?: {
    goal?: string
    userLevel?: 'beginner' | 'intermediate' | 'advanced'
    contentTypes?: string[]
  }): Promise<{
    summary: string
    keyPoints: string[]
    resources: Array<{
      title: string
      url: string
      description: string
      relevanceScore: number
    }>
    practicalApplications: string[]
  }> {
    const systemPrompt = `You are a research assistant specializing in finding high-quality, practical content for skill development and goal achievement. Your task is to research a given topic and provide:

1. A concise summary (2-3 sentences)
2. 5-7 key points from the research
3. 3-5 high-quality resources with titles, URLs, descriptions, and relevance scores (0-100)
4. 3-5 practical applications of the research

Focus on:
- Evidence-based information
- Practical applicability
- Credible sources
- Actionable insights
- Balance between academic research and practical implementation

Return a JSON response with this structure:
{
  "summary": "Brief summary",
  "keyPoints": ["point1", "point2", ...],
  "resources": [
    {
      "title": "Resource title",
      "url": "https://example.com",
      "description": "Brief description",
      "relevanceScore": 85
    }
  ],
  "practicalApplications": ["application1", "application2", ...]
}`

    const userPrompt = `Research topic: "${query}"
${context?.goal ? `Related goal: ${context.goal}` : ''}
${context?.userLevel ? `User level: ${context.userLevel}` : ''}
${context?.contentTypes ? `Preferred content types: ${context.contentTypes.join(', ')}` : ''}

Please conduct comprehensive research and provide the requested information in JSON format.`

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const response = await this.chat(messages, 'llama-3.3-70b-versatile', 0.3, 4096)
    
    try {
      return JSON.parse(response)
    } catch (error) {
      console.error('Failed to parse Groq research response:', error)
      throw new Error('Invalid response format from research API')
    }
  }

  async generateContentQuestions(content: string, numQuestions: number = 5): Promise<Array<{
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
  }>> {
    const systemPrompt = `You are an educational content expert specializing in creating multiple-choice questions to test understanding. Generate ${numQuestions} multiple-choice questions based on the provided content.

Each question should:
- Test understanding, not just memorization
- Have 4 options (A, B, C, D)
- Include a brief explanation of the correct answer
- Vary in difficulty (mix of easy, medium, hard)

Return a JSON response with this structure:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why this is correct"
    }
  ]
}`

    const userPrompt = `Content to generate questions from:
"${content}"

Generate ${numQuestions} multiple-choice questions to test understanding of this content.`

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const response = await this.chat(messages, 'llama-3.3-70b-versatile', 0.4, 2048)
    
    try {
      const parsed = JSON.parse(response)
      return parsed.questions || []
    } catch (error) {
      console.error('Failed to parse Groq questions response:', error)
      throw new Error('Invalid response format from questions API')
    }
  }

  async summarizeContent(content: string, maxLength: number = 500): Promise<string> {
    const systemPrompt = `You are a content summarization expert. Create a concise summary of the provided content that captures the key points while being easy to understand. The summary should be no more than ${maxLength} characters.`

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Content to summarize:\n${content}` },
    ]

    return this.chat(messages, 'llama-3.3-70b-versatile', 0.5, 1024)
  }

  async extractKeyInsights(content: string): Promise<string[]> {
    const systemPrompt = `You are an insight extraction expert. Extract the 5-7 most important insights from the provided content. Each insight should be:
- Actionable and practical
- Evidence-based when possible
- Clear and concise
- Valuable for achieving goals

Return a JSON response with this structure:
{
  "insights": ["insight1", "insight2", ...]
}`

    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Content to extract insights from:\n${content}` },
    ]

    const response = await this.chat(messages, 'llama-3.3-70b-versatile', 0.3, 1024)
    
    try {
      const parsed = JSON.parse(response)
      return parsed.insights || []
    } catch (error) {
      console.error('Failed to parse Groq insights response:', error)
      throw new Error('Invalid response format from insights API')
    }
  }
}

export const groqService = new GroqService()