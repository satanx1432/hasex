import { NVIDIANIMService } from '../ai/nvidia-nim'
import { contentResearchService } from '../content/research-service'

export interface WeeklyTaskGenerationContext {
  user_id: string
  goal_id: string
  goal_title: string
  goal_description?: string
  user_performance: {
    completion_rate: number
    average_difficulty_completed: number
    preferred_time_of_day: string
    preferred_days: string[]
    recent_streak: number
    total_tasks_completed: number
  }
  previous_tasks: Array<{
    title: string
    difficulty_score: number
    completion_status: string
    user_feedback?: string
  }>
  time_allocation: {
    daily_minutes: number
    available_days: string[]
  }
  current_week: number
  adaptive_frequency: 'daily' | 'every_other_day' | 'three_times_week' | 'weekly'
}

export interface GeneratedTask {
  title: string
  description: string
  if_then_plan: string
  difficulty_score: number
  estimated_minutes: number
  scheduled_day: string
  scheduled_time: string
  learning_objectives: string[]
  prerequisites: string[]
  success_criteria: string[]
  category: string
  adaptive_frequency: string
}

export interface WeeklyTaskSchedule {
  week_number: number
  start_date: string
  end_date: string
  tasks: GeneratedTask[]
  total_tasks: number
  adaptive_frequency: string
  reasoning: string
}

export class WeeklyTaskGenerator {
  private nvidiaService: NVIDIANIMService

  constructor() {
    this.nvidiaService = new NVIDIANIMService()
  }

  async generateWeeklyTasks(context: WeeklyTaskGenerationContext): Promise<WeeklyTaskSchedule> {
    // Determine adaptive frequency based on performance
    const adaptiveFrequency = this.determineAdaptiveFrequency(context.user_performance)

    // Calculate number of tasks for the week
    const numTasks = this.calculateNumberOfTasks(adaptiveFrequency, context.time_allocation)

    // Generate tasks using AI
    const tasks = await this.generateTasksWithAI(context, numTasks, adaptiveFrequency)

    // Schedule tasks based on user preferences
    const scheduledTasks = this.scheduleTasks(tasks, context)

    return {
      week_number: context.current_week,
      start_date: this.getWeekStartDate(context.current_week),
      end_date: this.getWeekEndDate(context.current_week),
      tasks: scheduledTasks,
      total_tasks: scheduledTasks.length,
      adaptive_frequency: adaptiveFrequency,
      reasoning: this.generateReasoning(context, adaptiveFrequency, numTasks),
    }
  }

  private determineAdaptiveFrequency(performance: WeeklyTaskGenerationContext['user_performance']): 'daily' | 'every_other_day' | 'three_times_week' | 'weekly' {
    const { completion_rate, recent_streak, average_difficulty_completed } = performance

    // High performers with good streak get daily tasks
    if (completion_rate >= 0.8 && recent_streak >= 5) {
      return 'daily'
    }

    // Good performers get every other day
    if (completion_rate >= 0.6 && recent_streak >= 3) {
      return 'every_other_day'
    }

    // Moderate performers get 3x per week
    if (completion_rate >= 0.4) {
      return 'three_times_week'
    }

    // Struggling performers get weekly tasks to start
    return 'weekly'
  }

  private calculateNumberOfTasks(
    frequency: string,
    timeAllocation: WeeklyTaskGenerationContext['time_allocation']
  ): number {
    const frequencyToDays: Record<string, number> = {
      daily: 7,
      every_other_day: 4,
      three_times_week: 3,
      weekly: 1,
    }

    const baseDays = frequencyToDays[frequency] || 3
    const availableDays = timeAllocation.available_days.length

    return Math.min(baseDays, availableDays)
  }

  private async generateTasksWithAI(
    context: WeeklyTaskGenerationContext,
    numTasks: number,
    frequency: string
  ): Promise<GeneratedTask[]> {
    const systemPrompt = `You are a behavioral science expert specializing in task generation for goal achievement. Generate ${numTasks} tasks for the week based on the user's context and performance.

Each task should be:
- Specific and actionable
- Formatted as an If-Then plan
- Appropriate difficulty based on user's history
- Aligned with their time constraints
- Designed to build momentum

Return a JSON response with this structure:
{
  "tasks": [
    {
      "title": "Task title",
      "description": "Brief description",
      "if_then_plan": "If [context], Then I will [action]",
      "difficulty_score": 1-10,
      "estimated_minutes": number,
      "learning_objectives": ["objective1", "objective2"],
      "prerequisites": ["prereq1"],
      "success_criteria": ["criteria1", "criteria2"],
      "category": "category_name"
    }
  ],
  "reasoning": "Why these tasks were chosen"
}`

    const userPrompt = this.buildTaskGenerationPrompt(context, numTasks, frequency)

    try {
      const response = await this.nvidiaService.makeRequest(
        'meta/llama-3.1-8b-instruct',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        0.7,
        2048
      )

      const parsed = JSON.parse(response)
      return parsed.tasks.map((task: any) => ({
        ...task,
        adaptive_frequency: frequency,
        scheduled_day: '',
        scheduled_time: '',
      }))
    } catch (error) {
      console.error('Failed to generate tasks with AI:', error)
      return this.getFallbackTasks(context, numTasks, frequency)
    }
  }

  private buildTaskGenerationPrompt(
    context: WeeklyTaskGenerationContext,
    numTasks: number,
    frequency: string
  ): string {
    let prompt = `Goal: "${context.goal_title}"\n`
    prompt += `Description: ${context.goal_description || 'Not provided'}\n\n`

    prompt += `User Performance:\n`
    prompt += `- Completion rate: ${context.user_performance.completion_rate * 100}%\n`
    prompt += `- Average difficulty completed: ${context.user_performance.average_difficulty_completed}/10\n`
    prompt += `- Preferred time: ${context.user_performance.preferred_time_of_day}\n`
    prompt += `- Preferred days: ${context.user_performance.preferred_days.join(', ')}\n`
    prompt += `- Current streak: ${context.user_performance.recent_streak} days\n`
    prompt += `- Total tasks completed: ${context.user_performance.total_tasks_completed}\n\n`

    prompt += `Time Allocation:\n`
    prompt += `- Daily minutes available: ${context.time_allocation.daily_minutes}\n`
    prompt += `- Available days: ${context.time_allocation.available_days.join(', ')}\n\n`

    prompt += `Task Frequency: ${frequency}\n`
    prompt += `Number of tasks: ${numTasks}\n\n`

    if (context.previous_tasks.length > 0) {
      prompt += `Previous Tasks:\n`
      context.previous_tasks.slice(-5).forEach((task, i) => {
        prompt += `${i + 1}. ${task.title} (Difficulty: ${task.difficulty_score}/10, Status: ${task.completion_status})\n`
        if (task.user_feedback) {
          prompt += `   Feedback: ${task.user_feedback}\n`
        }
      })
      prompt += '\n'
    }

    prompt += `Generate ${numTasks} tasks that are appropriately challenging and aligned with the user's performance level.`

    return prompt
  }

  private getFallbackTasks(
    context: WeeklyTaskGenerationContext,
    numTasks: number,
    frequency: string
  ): GeneratedTask[] {
    const baseTasks: GeneratedTask[] = [
      {
        title: `Quick progress on ${context.goal_title}`,
        description: 'A simple action to maintain momentum',
        if_then_plan: `If it is ${context.user_performance.preferred_time_of_day}, then I will spend 5 minutes on ${context.goal_title}`,
        difficulty_score: Math.max(1, Math.min(5, context.user_performance.average_difficulty_completed)),
        estimated_minutes: 5,
        scheduled_day: '',
        scheduled_time: context.user_performance.preferred_time_of_day,
        learning_objectives: ['Maintain momentum', 'Build consistency'],
        prerequisites: [],
        success_criteria: ['Task completed', 'Felt manageable'],
        category: 'momentum',
        adaptive_frequency: frequency,
      },
    ]

    // Add more tasks based on number needed
    for (let i = 1; i < numTasks; i++) {
      baseTasks.push({
        title: `Progress step ${i + 1} for ${context.goal_title}`,
        description: 'Continue building toward your goal',
        if_then_plan: `If I have completed the previous task, then I will take the next step for ${context.goal_title}`,
        difficulty_score: Math.min(10, context.user_performance.average_difficulty_completed + i),
        estimated_minutes: Math.min(30, context.time_allocation.daily_minutes),
        scheduled_day: '',
        scheduled_time: context.user_performance.preferred_time_of_day,
        learning_objectives: ['Build on previous progress', 'Develop skills'],
        prerequisites: i > 0 ? [`Complete step ${i}`] : [],
        success_criteria: ['Task completed', 'Skills improved'],
        category: 'progress',
        adaptive_frequency: frequency,
      })
    }

    return baseTasks.slice(0, numTasks)
  }

  private scheduleTasks(tasks: GeneratedTask[], context: WeeklyTaskGenerationContext): GeneratedTask[] {
    const availableDays = context.time_allocation.available_days.sort()
    const preferredTime = context.user_performance.preferred_time_of_day

    return tasks.map((task, index) => {
      const dayIndex = index % availableDays.length
      return {
        ...task,
        scheduled_day: availableDays[dayIndex],
        scheduled_time: preferredTime,
      }
    })
  }

  private generateReasoning(
    context: WeeklyTaskGenerationContext,
    frequency: string,
    numTasks: number
  ): string {
    const { completion_rate, recent_streak } = context.user_performance

    let reasoning = `Generated ${numTasks} tasks with ${frequency} frequency based on performance. `
    reasoning += `Current completion rate is ${completion_rate * 100}% with a ${recent_streak}-day streak. `

    if (completion_rate >= 0.8) {
      reasoning += 'High performance indicates readiness for more frequent, challenging tasks.'
    } else if (completion_rate >= 0.6) {
      reasoning += 'Good performance suggests steady progression with moderate frequency.'
    } else {
      reasoning += 'Building foundation with appropriate task frequency to ensure success.'
    }

    return reasoning
  }

  private getWeekStartDate(weekNumber: number): string {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const startDate = new Date(startOfYear.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000)
    return startDate.toISOString().split('T')[0]
  }

  private getWeekEndDate(weekNumber: number): string {
    const startDate = new Date(this.getWeekStartDate(weekNumber))
    const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000)
    return endDate.toISOString().split('T')[0]
  }

  async adaptFrequencyBasedOnPerformance(
    currentFrequency: string,
    recentPerformance: {
      completion_rate: number
      on_time_completion_rate: number
      user_satisfaction: number
    }
  ): Promise<string> {
    const { completion_rate, on_time_completion_rate, user_satisfaction } = recentPerformance

    // If performance is excellent, increase frequency
    if (completion_rate >= 0.9 && on_time_completion_rate >= 0.85 && user_satisfaction >= 0.8) {
      const frequencyLevels = ['weekly', 'three_times_week', 'every_other_day', 'daily']
      const currentIndex = frequencyLevels.indexOf(currentFrequency)
      if (currentIndex < frequencyLevels.length - 1) {
        return frequencyLevels[currentIndex + 1]
      }
    }

    // If performance is poor, decrease frequency
    if (completion_rate < 0.5 || user_satisfaction < 0.5) {
      const frequencyLevels = ['weekly', 'three_times_week', 'every_other_day', 'daily']
      const currentIndex = frequencyLevels.indexOf(currentFrequency)
      if (currentIndex > 0) {
        return frequencyLevels[currentIndex - 1]
      }
    }

    // Otherwise, maintain current frequency
    return currentFrequency
  }

  async enrichTasksWithLearningContent(
    tasks: GeneratedTask[],
    goalTitle: string
  ): Promise<GeneratedTask[]> {
    for (const task of tasks) {
      if (task.learning_objectives.length > 0) {
        try {
          const research = await contentResearchService.researchTopic(
            `${goalTitle}: ${task.learning_objectives[0]}`,
            {
              scrapeContent: false,
              maxUrls: 2,
            }
          )

          // Add key insights as additional learning objectives
          if (research.keyPoints.length > 0) {
            task.learning_objectives = [
              ...task.learning_objectives,
              ...research.keyPoints.slice(0, 2),
            ]
          }
        } catch (error) {
          console.error('Failed to enrich task with learning content:', error)
        }
      }
    }

    return tasks
  }
}

export const weeklyTaskGenerator = new WeeklyTaskGenerator()