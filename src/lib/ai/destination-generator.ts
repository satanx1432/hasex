interface DestinationResult {
  destination: string
  duration: string
  complexity: 'low' | 'medium' | 'high'
  reasoning: string
}

class DestinationGenerator {
  async generateDestination(goal: string, goalType?: string): Promise<DestinationResult> {
    try {
      const { nvidiaNIMService } = await import('./nvidia-nim')

      const systemPrompt = `You are a strategic goal expert. Your job is to infer the ACTUAL destination behind the user's stated goal.

The user might say:
- "I want to build a startup" → The destination is "Build a profitable startup solving a meaningful problem"
- "I want to become a doctor" → The destination is "Become a licensed physician practicing medicine"
- "I want better grades" → The destination is "Achieve academic excellence with strong understanding"
- "I want to get fit" → The destination is "Build sustainable fitness habits and physical health"

Your task:
1. Infer the actual destination (be specific and meaningful)
2. Estimate realistic duration (e.g., "1-3 years", "3-6 months", "2-4 weeks")
3. Assess complexity (low/medium/high)
4. Explain your reasoning

Return JSON format:
{
  "destination": string,
  "duration": string,
  "complexity": "low" | "medium" | "high",
  "reasoning": string
}`

      const goalContext = goalType ? `Goal Type: ${goalType}\n` : ''
      const userPrompt = `${goalContext}User's stated goal: "${goal}"

Infer the actual destination.`

      const response = await nvidiaNIMService.makeRequest('nvidia/llama-3.1-nemotron-70b-instruct', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.7)

      if (response) {
        const parsed = JSON.parse(response)
        return parsed
      }
    } catch (error) {
      console.error('Failed to generate destination:', error)
    }

    // Fallback destination
    return {
      destination: goal,
      duration: '3-6 months',
      complexity: 'medium',
      reasoning: 'Fallback - AI generation unavailable'
    }
  }
}

export const destinationGenerator = new DestinationGenerator()
