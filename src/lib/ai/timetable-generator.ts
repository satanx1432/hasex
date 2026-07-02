interface TimeSlot {
  time: string
  activity: string
  duration: number // minutes
}

interface DailyTimetable {
  id: string
  date: string
  missionId: string
  timeSlots: TimeSlot[]
  totalDuration: number
  preferredStartTime?: string
}

class TimetableGenerator {
  async generateTimetable(
    dailyMission: any,
    userPreferences: {
      preferredStartTime?: string
      availableHours?: number[]
      focusDuration?: number
      breakDuration?: number
    } = {}
  ): Promise<DailyTimetable> {
    const {
      preferredStartTime = '7:00 PM',
      availableHours = [18, 19, 20, 21], // 6 PM - 9 PM
      focusDuration = 25,
      breakDuration = 5
    } = userPreferences

    try {
      const { nvidiaNIMService } = await import('./nvidia-nim')

      const systemPrompt = `You are a time management expert. Your job is to create a detailed daily timetable for completing the user's daily mission.

Daily mission: "${dailyMission.title}"
Mission description: ${dailyMission.description}
Specific actions: ${dailyMission.specificActions.join(', ')}
Estimated time: ${dailyMission.estimatedTime}
Difficulty: ${dailyMission.difficulty}

User preferences:
- Preferred start time: ${preferredStartTime}
- Available hours: ${availableHours.map(h => `${h}:00`).join(', ')}
- Focus duration: ${focusDuration} minutes
- Break duration: ${breakDuration} minutes

Create a realistic timetable that:
- Breaks down the mission into specific time slots
- Includes preparation time
- Includes execution time for each action
- Includes short breaks between tasks
- Includes review/reflection time
- Matches the estimated time of the mission
- Is realistic and achievable

Example format:
- 6:00 PM - Prepare questions (10 min)
- 6:10 PM - Interview User 1 (15 min)
- 6:25 PM - Short break (5 min)
- 6:30 PM - Interview User 2 (15 min)
- 6:45 PM - Write notes (10 min)
- 6:55 PM - Summarize insights (10 min)

Return JSON format:
{
  "id": "timetable_${Date.now()}",
  "date": "${new Date().toISOString().split('T')[0]}",
  "missionId": "${dailyMission.id}",
  "timeSlots": [
    {
      "time": "6:00 PM",
      "activity": "Prepare questions",
      "duration": 10
    },
    {
      "time": "6:10 PM",
      "activity": "Interview User 1",
      "duration": 15
    },
    ...
  ],
  "totalDuration": number (total minutes),
  "preferredStartTime": "${preferredStartTime}"
}`

      const userPrompt = `Generate a timetable for: ${dailyMission.title}`

      const response = await nvidiaNIMService.makeRequest('qwen/qwen3.5-397b-a17b', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], 0.7)

      if (response) {
        const parsed = JSON.parse(response)
        return parsed
      }
    } catch (error) {
      console.error('Failed to generate timetable:', error)
    }

    // Fallback timetable
    const fallbackSlots: TimeSlot[] = [
      {
        time: preferredStartTime,
        activity: 'Prepare and get started',
        duration: 5
      },
      {
        time: this.addMinutes(preferredStartTime, 5),
        activity: dailyMission.specificActions[0] || 'Start mission',
        duration: 20
      },
      {
        time: this.addMinutes(preferredStartTime, 25),
        activity: 'Short break',
        duration: 5
      },
      {
        time: this.addMinutes(preferredStartTime, 30),
        activity: dailyMission.specificActions[1] || 'Continue mission',
        duration: 20
      },
      {
        time: this.addMinutes(preferredStartTime, 50),
        activity: dailyMission.specificActions[2] || 'Complete mission',
        duration: 10
      }
    ]

    return {
      id: `timetable_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      missionId: dailyMission.id,
      timeSlots: fallbackSlots,
      totalDuration: 60,
      preferredStartTime
    }
  }

  private addMinutes(time: string, minutes: number): string {
    const [timePart, period] = time.split(' ')
    let [hours, mins] = timePart.split(':').map(Number)

    let totalMinutes = hours * 60 + mins + minutes
    const newHours = Math.floor(totalMinutes / 60) % 12 || 12
    const newMins = totalMinutes % 60
    const newPeriod = Math.floor(totalMinutes / 60) >= 12 ? 'PM' : 'AM'

    return `${newHours}:${newMins.toString().padStart(2, '0')} ${newPeriod}`
  }
}

export const timetableGenerator = new TimetableGenerator()
