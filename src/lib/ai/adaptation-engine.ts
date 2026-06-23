interface CheckInData {
  missionId: string
  completionStatus: 'yes' | 'partially' | 'no'
  failureCategory?: string
  whatStoppedYou?: string
  whatHelped?: string
  timestamp: string
}

interface AdaptationResult {
  adaptationType: 'reminders' | 'difficulty_reduction' | 'motivation_boost' | 'environment_change' | 'no_change'
  recommendation: string
  reason: string
  adjustedMission?: any
  adjustedTimetable?: any
  newIntentions?: any[]
}

class AdaptationEngine {
  async analyzeAndAdapt(
    checkInData: CheckInData,
    currentMission: any,
    userHistory: {
      completedCount: number
      partialCount: number
      failedCount: number
      streak: number
    }
  ): Promise<AdaptationResult> {
    try {
      const { nvidiaNIMService } = await import('./nvidia-nim')

      const systemPrompt = `You are a behavioral adaptation expert. Your job is to analyze why the user didn't complete their mission and recommend adaptations.

Check-in data:
- Completion status: ${checkInData.completionStatus}
- Failure category: ${checkInData.failureCategory || 'N/A'}
- What stopped you: ${checkInData.whatStoppedYou || 'N/A'}
- What helped: ${checkInData.whatHelped || 'N/A'}

Current mission: "${currentMission.title}"
Mission difficulty: ${currentMission.difficulty}
Estimated time: ${currentMission.estimatedTime}

User history:
- Completed: ${userHistory.completedCount}
- Partial: ${userHistory.partialCount}
- Failed: ${userHistory.failedCount}
- Current streak: ${userHistory.streak}

Analyze the failure and recommend one of these adaptations:

1. REMINDERS - If they forgot (prompt problem)
   Recommendation: Add specific reminders, prompts, or cues

2. DIFFICULTY_REDUCTION - If too hard (ability problem)
   Recommendation: Reduce mission difficulty, break into smaller steps

3. MOTIVATION_BOOST - If no motivation (motivation problem)
   Recommendation: Reconnect to why this matters, show progress

4. ENVIRONMENT_CHANGE - If distracted (environment problem)
   Recommendation: Change environment, remove distractions, better IF-THEN plans

5. NO_CHANGE - If this is a one-time issue or the problem is external

For each adaptation, provide:
- adaptationType: One of the above
- recommendation: Specific, actionable recommendation
- reason: Why this adaptation will help

Return JSON format:
{
  "adaptationType": "reminders" | "difficulty_reduction" | "motivation_boost" | "environment_change" | "no_change",
  "recommendation": "Specific recommendation",
  "reason": "Why this will help"
}`

      const userPrompt = `Analyze this check-in and recommend adaptation: ${checkInData.completionStatus} - ${checkInData.failureCategory}`

      const response = await nvidiaNIMService.makeRequest('nvidia/llama-3.1-nemotron-70b-instruct', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.7)

      if (response) {
        const parsed = JSON.parse(response)
        return parsed
      }
    } catch (error) {
      console.error('Failed to analyze and adapt:', error)
    }

    // Fallback adaptation logic
    const failureCategories: Record<string, AdaptationResult> = {
      forgot: {
        adaptationType: 'reminders',
        recommendation: 'Set a phone reminder for 7 PM and put a sticky note on your computer',
        reason: 'External cues will help you remember'
      },
      too_hard: {
        adaptationType: 'difficulty_reduction',
        recommendation: 'Reduce the mission to just the first action and focus on quality',
        reason: 'Starting small builds momentum and confidence'
      },
      no_motivation: {
        adaptationType: 'motivation_boost',
        recommendation: 'Review your goal and why this specific mission matters for your long-term success',
        reason: 'Connecting to purpose increases motivation'
      },
      no_time: {
        adaptationType: 'difficulty_reduction',
        recommendation: 'Break this into two 15-minute sessions instead of one longer session',
        reason: 'Smaller time blocks are easier to fit into busy schedules'
      },
      distracted: {
        adaptationType: 'environment_change',
        recommendation: 'Work in a different room and use website blockers during mission time',
        reason: 'Changing environment reduces distraction triggers'
      }
    }

    return (
      failureCategories[checkInData.failureCategory || ''] || {
        adaptationType: 'no_change',
        recommendation: 'Try again tomorrow - this might have been a one-time issue',
        reason: 'Single instances don\'t indicate a pattern requiring adaptation'
      }
    )
  }

  async generateAdjustedMission(
    originalMission: any,
    adaptationType: string
  ): Promise<any> {
    // This would generate a modified version of the mission based on adaptation type
    // For now, return the original with adjusted difficulty or duration
    if (adaptationType === 'difficulty_reduction') {
      return {
        ...originalMission,
        difficulty: originalMission.difficulty === 'hard' ? 'medium' : 'easy',
        specificActions: originalMission.specificActions.slice(0, 2),
        estimatedTime: this.reduceTime(originalMission.estimatedTime)
      }
    }

    return originalMission
  }

  private reduceTime(timeStr: string): string {
    const match = timeStr.match(/(\d+)/)
    if (match) {
      const minutes = parseInt(match[0])
      return `${Math.max(10, Math.floor(minutes * 0.6))} minutes`
    }
    return timeStr
  }
}

export const adaptationEngine = new AdaptationEngine()
