interface DailyMission {
  id: string
  title: string
  description: string
  specificActions: string[]
  whyItMatters: string
  estimatedTime: string
  difficulty: 'easy' | 'medium' | 'hard'
  expectedOutcome: string
  stageId?: string
  date: string
}

class DailyMissionGenerator {
  async generateDailyMission(
    currentStage: any,
    userProgress: {
      completedActions: number
      currentStreak: number
      skillLevel: string
    },
    previousMissions: string[] = []
  ): Promise<DailyMission> {
    try {
      const { nvidiaNIMService } = await import('./nvidia-nim')

      const systemPrompt = `You are a task design expert. Your job is to generate ONE specific, high-leverage daily mission that moves the user forward in their current stage.

Current stage: "${currentStage.title}"
Stage description: ${currentStage.description}
Stage skills: ${currentStage.skills.join(', ')}

User progress:
- Completed actions: ${userProgress.completedActions}
- Current streak: ${userProgress.currentStreak} days
- Skill level: ${userProgress.skillLevel}

Previous missions (avoid repetition): ${previousMissions.slice(-3).join(', ')}

Generate ONE specific daily mission. The mission should be:
- Specific and actionable (not vague like "work on startup")
- High leverage - moves them meaningfully forward
- Appropriate to their skill level
- Realistic to complete in one sitting
- Connected to the current stage objectives

Examples of good missions:
❌ "Work on startup"
✅ "Interview 2 potential users. Ask: 1) What frustrates you most? 2) What have you tried? 3) Why didn't it work?"

❌ "Learn Python"
✅ "Write a Python script that reads a CSV file and calculates the average"

❌ "Exercise"
✅ "Complete 20 pushups, 30 squats, and a 1-minute plank"

Include:
- specificActions: Array of 3-5 concrete steps
- whyItMatters: Explain the strategic value
- estimatedTime: Realistic time estimate (e.g., "30 minutes", "1 hour")
- difficulty: easy/medium/hard based on user skill level
- expectedOutcome: What they'll accomplish

Return JSON format:
{
  "id": "mission_${Date.now()}",
  "title": "Brief, action-oriented title",
  "description": "One-sentence summary of the mission",
  "specificActions": ["step 1", "step 2", "step 3"],
  "whyItMatters": "Strategic explanation",
  "estimatedTime": "X minutes",
  "difficulty": "easy" | "medium" | "hard",
  "expectedOutcome": "What they'll accomplish",
  "stageId": "${currentStage.id}",
  "date": "${new Date().toISOString().split('T')[0]}"
}`

      const userPrompt = `Generate a daily mission for stage: ${currentStage.title}`

      const response = await nvidiaNIMService.makeRequest('glm-5.1', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.7)

      if (response) {
        const parsed = JSON.parse(response)
        return parsed
      }
    } catch (error) {
      console.error('Failed to generate daily mission:', error)
    }

    // Fallback mission
    return {
      id: `mission_${Date.now()}`,
      title: 'Practice Core Skill',
      description: `Practice the main skill from ${currentStage.title}`,
      specificActions: [
        'Review the core concepts',
        'Complete a practice exercise',
        'Document what you learned'
      ],
      whyItMatters: 'Consistent practice builds mastery and retention',
      estimatedTime: '30 minutes',
      difficulty: 'medium',
      expectedOutcome: 'Improved understanding and practical skill',
      stageId: currentStage.id,
      date: new Date().toISOString().split('T')[0]
    }
  }

  async generateMissionBatch(
    stage: any,
    days: number = 7
  ): Promise<DailyMission[]> {
    const missions: DailyMission[] = []
    const previousMissions: string[] = []

    for (let i = 0; i < days; i++) {
      const mission = await this.generateDailyMission(
        stage,
        {
          completedActions: i,
          currentStreak: i,
          skillLevel: 'intermediate'
        },
        previousMissions
      )
      missions.push(mission)
      previousMissions.push(mission.title)
    }

    return missions
  }
}

export const dailyMissionGenerator = new DailyMissionGenerator()
