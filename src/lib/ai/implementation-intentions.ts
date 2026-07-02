interface ImplementationIntention {
  id: string
  ifCondition: string
  thenAction: string
  category: 'timing' | 'obstacle' | 'opportunity' | 'resource'
  priority: 'high' | 'medium' | 'low'
}

class ImplementationIntentionGenerator {
  async generateImplementationIntentions(
    goal: string,
    dailyMission: any,
    userContext: {
      commonBarriers: string[]
      preferredTimes: string[]
      workSchedule: string
      environment: string
    }
  ): Promise<ImplementationIntention[]> {
    try {
      const { nvidiaNIMService } = await import('./nvidia-nim')

      const systemPrompt = `You are a behavioral science expert specializing in implementation intentions (IF-THEN plans). Your job is to create specific IF-THEN plans to help the user succeed.

Goal: "${goal}"
Daily mission: "${dailyMission.title}"
Mission description: ${dailyMission.description}
Estimated time: ${dailyMission.estimatedTime}

User context:
- Common barriers: ${userContext.commonBarriers.join(', ')}
- Preferred times: ${userContext.preferredTimes.join(', ')}
- Work schedule: ${userContext.workSchedule}
- Environment: ${userContext.environment}

Generate 5-7 implementation intentions covering different categories:

1. TIMING: When exactly to do the mission
   Example: "IF it is 7 PM AND I finish dinner, THEN I work on MVP for 30 minutes"

2. OBSTACLE: What to do when barriers arise
   Example: "IF I get distracted, THEN I put my phone in another room for 30 minutes"

3. OPPORTUNITY: How to handle unexpected opportunities
   Example: "IF I get a new startup idea, THEN I write it down AND continue current path"

4. RESOURCE: How to manage resources
   Example: "IF I feel too tired, THEN I do a 5-minute version instead"

Each intention should be:
- Specific and actionable
- Realistic for the user's situation
- Address their specific barriers
- Help them stay on track

Return JSON format:
[
  {
    "id": "ii_1",
    "ifCondition": "IF it is 7 PM AND I finish dinner",
    "thenAction": "THEN I work on MVP for 30 minutes",
    "category": "timing",
    "priority": "high"
  },
  ...
]`

      const userPrompt = `Generate implementation intentions for: ${dailyMission.title}`

      const response = await nvidiaNIMService.makeRequest('qwen/qwen3.5-397b-a17b', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.7)

      if (response) {
        const parsed = JSON.parse(response)
        return parsed
      }
    } catch (error) {
      console.error('Failed to generate implementation intentions:', error)
    }

    // Fallback intentions
    return [
      {
        id: 'ii_1',
        ifCondition: 'IF it is 7 PM',
        thenAction: 'THEN I start working on my daily mission',
        category: 'timing',
        priority: 'high'
      },
      {
        id: 'ii_2',
        ifCondition: 'IF I get distracted',
        thenAction: 'THEN I close all browser tabs and focus for 25 minutes',
        category: 'obstacle',
        priority: 'high'
      },
      {
        id: 'ii_3',
        ifCondition: 'IF I feel too tired',
        thenAction: 'THEN I do a simplified version for 10 minutes',
        category: 'obstacle',
        priority: 'medium'
      },
      {
        id: 'ii_4',
        ifCondition: 'IF I complete the mission early',
        thenAction: 'THEN I review what I learned and plan tomorrow',
        category: 'opportunity',
        priority: 'medium'
      },
      {
        id: 'ii_5',
        ifCondition: 'IF I get interrupted',
        thenAction: 'THEN I note the interruption and return to the task within 5 minutes',
        category: 'obstacle',
        priority: 'medium'
      }
    ]
  }
}

export const implementationIntentionGenerator = new ImplementationIntentionGenerator()
