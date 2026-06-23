import { NVIDIANIMService } from '../ai/nvidia-nim'

export interface TimeBlock {
  id: string
  goal_id: string
  goal_title: string
  start_time: string
  end_time: string
  duration_minutes: number
  priority: 'high' | 'medium' | 'low'
  energy_requirement: 'high' | 'medium' | 'low'
  flexible: boolean
  completed: boolean
}

export interface Schedule {
  id: string
  date: string
  user_id: string
  time_blocks: TimeBlock[]
  total_allocated_minutes: number
  available_minutes: number
  optimization_score: number
  breaks_scheduled: number
}

export interface TimeAllocationRequest {
  user_id: string
  goals: Array<{
    id: string
    title: string
    priority_score: number
    estimated_time_needed: number
    deadline?: string
    preferred_times?: string[]
  }>
  constraints: {
    available_hours_per_day: number
    preferred_days: string[]
    peak_energy_times: string[]
    break_intervals: number
    minimum_break_duration: number
    focus_session_length: number
  }
  existing_commitments?: Array<{
    start_time: string
    end_time: string
    title: string
    type: 'meeting' | 'appointment' | 'fixed'
  }>
}

export interface ScheduleOptimization {
  original_schedule: Schedule
  optimized_schedule: Schedule
  improvements: string[]
  trade_offs: string[]
  confidence_score: number
  alternative_schedules: Schedule[]
}

export class TimeAllocationSystem {
  private nvidiaService: NVIDIANIMService

  constructor() {
    this.nvidiaService = new NVIDIANIMService()
  }

  async generateSchedule(request: TimeAllocationRequest): Promise<Schedule> {
    const availableMinutes = request.constraints.available_hours_per_day * 60
    const timeBlocks = await this.generateTimeBlocks(request, availableMinutes)

    const schedule: Schedule = {
      id: `schedule_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      user_id: request.user_id,
      time_blocks: timeBlocks,
      total_allocated_minutes: timeBlocks.reduce((sum, block) => sum + block.duration_minutes, 0),
      available_minutes: availableMinutes,
      optimization_score: this.calculateOptimizationScore(timeBlocks, request),
      breaks_scheduled: this.countBreaks(timeBlocks),
    }

    return schedule
  }

  private async generateTimeBlocks(
    request: TimeAllocationRequest,
    availableMinutes: number
  ): Promise<TimeBlock[]> {
    const timeBlocks: TimeBlock[] = []
    const sortedGoals = [...request.goals].sort((a, b) => b.priority_score - a.priority_score)

    let currentTime = this.getStartOfDay(request.constraints.peak_energy_times[0] || 'morning')
    const endTime = this.getEndOfDay(currentTime, request.constraints.available_hours_per_day)

    for (const goal of sortedGoals) {
      const duration = Math.min(goal.estimated_time_needed, request.constraints.focus_session_length)
      
      if (this.hasTimeAvailable(currentTime, endTime, duration)) {
        const block: TimeBlock = {
          id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          goal_id: goal.id,
          goal_title: goal.title,
          start_time: currentTime,
          end_time: this.addMinutes(currentTime, duration),
          duration_minutes: duration,
          priority: this.getPriorityLevel(goal.priority_score),
          energy_requirement: this.getEnergyRequirement(goal.priority_score),
          flexible: true,
          completed: false,
        }

        timeBlocks.push(block)
        currentTime = this.addMinutes(block.end_time, request.constraints.minimum_break_duration)
      }
    }

    return timeBlocks
  }

  private getStartOfDay(peakTime: string): string {
    const now = new Date()
    const hour = peakTime === 'morning' ? 8 : peakTime === 'afternoon' ? 13 : 9
    now.setHours(hour, 0, 0, 0)
    return now.toTimeString().slice(0, 5)
  }

  private getEndOfDay(startTime: string, availableHours: number): string {
    const [hours, minutes] = startTime.split(':').map(Number)
    const date = new Date()
    date.setHours(hours + availableHours, minutes, 0, 0)
    return date.toTimeString().slice(0, 5)
  }

  private hasTimeAvailable(currentTime: string, endTime: string, duration: number): boolean {
    const current = this.timeToMinutes(currentTime)
    const end = this.timeToMinutes(endTime)
    return current + duration <= end
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  private addMinutes(time: string, minutes: number): string {
    const totalMinutes = this.timeToMinutes(time) + minutes
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  private getPriorityLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) return 'high'
    if (score >= 60) return 'medium'
    return 'low'
  }

  private getEnergyRequirement(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) return 'high'
    if (score >= 60) return 'medium'
    return 'low'
  }

  private calculateOptimizationScore(timeBlocks: TimeBlock[], request: TimeAllocationRequest): number {
    let score = 100

    // Penalty for not allocating all available time
    const totalAllocated = timeBlocks.reduce((sum, block) => sum + block.duration_minutes, 0)
    const utilization = totalAllocated / (request.constraints.available_hours_per_day * 60)
    score -= (1 - utilization) * 20

    // Bonus for aligning with peak energy times
    const peakTimeMatches = timeBlocks.filter(block => 
      this.isInPeakEnergyTime(block.start_time, request.constraints.peak_energy_times)
    ).length
    score += (peakTimeMatches / timeBlocks.length) * 10

    // Bonus for proper break distribution
    const breakScore = this.evaluateBreakDistribution(timeBlocks, request.constraints)
    score += breakScore * 5

    return Math.min(100, Math.max(0, score))
  }

  private isInPeakEnergyTime(time: string, peakTimes: string[]): boolean {
    const hour = parseInt(time.split(':')[0])
    return peakTimes.some(peak => {
      if (peak === 'morning') return hour >= 8 && hour <= 11
      if (peak === 'afternoon') return hour >= 13 && hour <= 16
      if (peak === 'evening') return hour >= 18 && hour <= 21
      return false
    })
  }

  private evaluateBreakDistribution(timeBlocks: TimeBlock[], constraints: any): number {
    if (timeBlocks.length < 2) return 1

    let properBreaks = 0
    for (let i = 1; i < timeBlocks.length; i++) {
      const prevEnd = this.timeToMinutes(timeBlocks[i - 1].end_time)
      const currStart = this.timeToMinutes(timeBlocks[i].start_time)
      const gap = currStart - prevEnd

      if (gap >= constraints.minimum_break_duration && gap <= constraints.minimum_break_duration * 2) {
        properBreaks++
      }
    }

    return properBreaks / (timeBlocks.length - 1)
  }

  private countBreaks(timeBlocks: TimeBlock[]): number {
    return Math.max(0, timeBlocks.length - 1)
  }

  async optimizeSchedule(currentSchedule: Schedule, userFeedback?: string): Promise<ScheduleOptimization> {
    const systemPrompt = `You are a scheduling optimization expert. Analyze the current schedule and suggest improvements.

Consider:
- Task priority alignment
- Energy level matching
- Break optimization
- Flexibility for unexpected events
- Work-life balance

Return a JSON response with this structure:
{
  "improvements": ["improvement 1", "improvement 2"],
  "trade_offs": ["trade off 1", "trade off 2"],
  "confidence_score": 0-100,
  "suggested_adjustments": [
    {
      "block_id": "block_id",
      "new_start_time": "HH:MM",
      "new_duration": number,
      "reason": "why this change"
    }
  ]
}`

    const userPrompt = this.buildOptimizationPrompt(currentSchedule, userFeedback)

    try {
      const response = await this.nvidiaService.makeRequest(
        'meta/llama-3.1-8b-instruct',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        0.7,
        1024
      )

      const parsed = JSON.parse(response)
      const optimizedSchedule = this.applyOptimizations(currentSchedule, parsed.suggested_adjustments)

      return {
        original_schedule: currentSchedule,
        optimized_schedule: optimizedSchedule,
        improvements: parsed.improvements || [],
        trade_offs: parsed.trade_offs || [],
        confidence_score: parsed.confidence_score || 75,
        alternative_schedules: [],
      }
    } catch (error) {
      console.error('Failed to optimize schedule:', error)
      return this.getFallbackOptimization(currentSchedule)
    }
  }

  private buildOptimizationPrompt(schedule: Schedule, userFeedback?: string): string {
    let prompt = `Current schedule for ${schedule.date}:\n\n`
    prompt += `Total allocated: ${schedule.total_allocated_minutes} minutes\n`
    prompt += `Optimization score: ${schedule.optimization_score}/100\n\n`
    prompt += `Time blocks:\n`

    schedule.time_blocks.forEach((block, index) => {
      prompt += `${index + 1}. ${block.goal_title}\n`
      prompt += `   Time: ${block.start_time} - ${block.end_time}\n`
      prompt += `   Duration: ${block.duration_minutes} minutes\n`
      prompt += `   Priority: ${block.priority}\n`
      prompt += `   Energy required: ${block.energy_requirement}\n\n`
    })

    if (userFeedback) {
      prompt += `User feedback: ${userFeedback}\n`
    }

    prompt += '\nSuggest optimizations to improve this schedule.'

    return prompt
  }

  private applyOptimizations(schedule: Schedule, adjustments: any[]): Schedule {
    const optimizedBlocks = [...schedule.time_blocks]

    adjustments.forEach(adjustment => {
      const blockIndex = optimizedBlocks.findIndex(b => b.id === adjustment.block_id)
      if (blockIndex !== -1) {
        optimizedBlocks[blockIndex] = {
          ...optimizedBlocks[blockIndex],
          start_time: adjustment.new_start_time || optimizedBlocks[blockIndex].start_time,
          end_time: adjustment.new_start_time 
            ? this.addMinutes(adjustment.new_start_time, adjustment.new_duration || optimizedBlocks[blockIndex].duration_minutes)
            : optimizedBlocks[blockIndex].end_time,
          duration_minutes: adjustment.new_duration || optimizedBlocks[blockIndex].duration_minutes,
        }
      }
    })

    return {
      ...schedule,
      time_blocks: optimizedBlocks,
      optimization_score: this.calculateOptimizationScore(optimizedBlocks, {} as any),
    }
  }

  private getFallbackOptimization(schedule: Schedule): ScheduleOptimization {
    return {
      original_schedule: schedule,
      optimized_schedule: schedule,
      improvements: ['Schedule is already well-optimized'],
      trade_offs: [],
      confidence_score: 70,
      alternative_schedules: [],
    }
  }

  async rescheduleForDay(
    userId: string,
    date: string,
    unexpectedEvent: {
      start_time: string
      end_time: string
      duration: number
    }
  ): Promise<Schedule> {
    // In production, this would fetch the existing schedule for the date
    // and adjust it to accommodate the unexpected event
    
    const systemPrompt = `You are a rescheduling expert. An unexpected event has come up that requires ${unexpectedEvent.duration} minutes.

Generate a rescheduled plan that:
- Minimizes disruption to high-priority tasks
- Preserves break times
- Maintains energy alignment
- Provides flexibility

Return a JSON response with this structure:
{
  "rescheduled_blocks": [
    {
      "block_id": "block_id",
      "new_start_time": "HH:MM",
      "new_end_time": "HH:MM",
      "reason": "why this rescheduling"
    }
  ],
  "cancelled_blocks": ["block_id"],
  "affected_goals": ["goal_id"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`

    try {
      const response = await this.nvidiaService.makeRequest(
        'meta/llama-3.1-8b-instruct',
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Unexpected event from ${unexpectedEvent.start_time} to ${unexpectedEvent.end_time}` },
        ],
        0.7,
        512
      )

      const parsed = JSON.parse(response)
      // Apply rescheduling logic here
      
      throw new Error('Rescheduling not yet implemented')
    } catch (error) {
      console.error('Failed to reschedule:', error)
      throw error
    }
  }
}
