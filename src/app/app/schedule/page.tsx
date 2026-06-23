'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TimeAllocationSystem, Schedule, TimeBlock } from '@/lib/scheduling/time-allocation-system'

export default function SchedulePage() {
  const router = useRouter()
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showOptimization, setShowOptimization] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<any>(null)

  const timeAllocationSystem = new TimeAllocationSystem()

  useEffect(() => {
    loadSchedule()
  }, [selectedDate])

  const loadSchedule = async () => {
    setIsLoading(true)
    try {
      // Mock request - in production this would come from user data
      const request = {
        user_id: 'user_123',
        goals: [
          {
            id: 'goal_1',
            title: 'Learn TypeScript',
            priority_score: 85,
            estimated_time_needed: 120,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'goal_2',
            title: 'Build Portfolio',
            priority_score: 72,
            estimated_time_needed: 180,
          },
          {
            id: 'goal_3',
            title: 'Exercise',
            priority_score: 65,
            estimated_time_needed: 60,
          },
        ],
        constraints: {
          available_hours_per_day: 6,
          preferred_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          peak_energy_times: ['morning', 'afternoon'],
          break_intervals: 90,
          minimum_break_duration: 15,
          focus_session_length: 60,
        },
      }

      const data = await timeAllocationSystem.generateSchedule(request)
      setSchedule(data)
    } catch (error) {
      console.error('Failed to load schedule:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOptimize = async () => {
    if (!schedule) return

    try {
      const result = await timeAllocationSystem.optimizeSchedule(schedule)
      setOptimizationResult(result)
      setShowOptimization(true)
    } catch (error) {
      console.error('Failed to optimize schedule:', error)
    }
  }

  const applyOptimization = () => {
    if (optimizationResult?.optimized_schedule) {
      setSchedule(optimizationResult.optimized_schedule)
      setShowOptimization(false)
      setOptimizationResult(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-error-container border-error'
      case 'medium':
        return 'bg-primary-container border-primary'
      case 'low':
        return 'bg-surface-variant border-border'
      default:
        return 'bg-surface border-border'
    }
  }

  const getEnergyColor = (energy: string) => {
    switch (energy) {
      case 'high':
        return 'text-error'
      case 'medium':
        return 'text-primary'
      case 'low':
        return 'text-on-surface-variant'
      default:
        return 'text-on-surface-variant'
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="fixed top-0 left-0 w-full z-50 bg-background border-b border-border">
        <nav className="flex justify-between items-center w-full px-grid-margin py-stack-sm max-w-[640px] mx-auto">
          <button
            onClick={() => router.back()}
            className="material-symbols-outlined text-primary"
            data-icon="arrow_back"
          >
            arrow_back
          </button>
          <span className="font-label-mono text-label-mono tracking-widest text-primary">Schedule</span>
          <button
            onClick={handleOptimize}
            className="material-symbols-outlined text-primary"
            data-icon="auto_awesome"
          >
            auto_awesome
          </button>
        </nav>
      </header>

      <main className="pt-24 pb-32 px-grid-margin min-h-screen">
        <div className="max-w-[640px] mx-auto">
          {/* Date Selector */}
          <section className="mb-stack-lg">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-surface border border-border p-4 font-body-md text-body-md text-primary rounded-xl"
            />
          </section>

          {/* Schedule Overview */}
          {schedule && (
            <section className="mb-stack-lg">
              <div className="bg-surface border border-border p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="font-label-mono text-label-mono text-on-surface-variant text-xs mb-1">
                      Time Allocated
                    </p>
                    <p className="font-headline-lg text-headline-lg text-primary">
                      {Math.round(schedule.total_allocated_minutes / 60)}h {schedule.total_allocated_minutes % 60}m
                    </p>
                  </div>
                  <div>
                    <p className="font-label-mono text-label-mono text-on-surface-variant text-xs mb-1">
                      Available
                    </p>
                    <p className="font-headline-lg text-headline-lg text-primary">
                      {Math.round(schedule.available_minutes / 60)}h
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                      Utilization
                    </span>
                    <span className="font-label-mono text-label-mono text-primary text-xs">
                      {Math.round((schedule.total_allocated_minutes / schedule.available_minutes) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-500"
                      style={{
                        width: `${(schedule.total_allocated_minutes / schedule.available_minutes) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label-mono text-label-mono text-on-surface-variant text-xs mb-1">
                      Optimization Score
                    </p>
                    <p className="font-headline-md text-headline-md text-primary">
                      {Math.round(schedule.optimization_score)}/100
                    </p>
                  </div>
                  <div>
                    <p className="font-label-mono text-label-mono text-on-surface-variant text-xs mb-1">
                      Breaks Scheduled
                    </p>
                    <p className="font-headline-md text-headline-md text-primary">
                      {schedule.breaks_scheduled}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Time Blocks */}
          {schedule && (
            <section className="mb-stack-lg">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Time Blocks
              </h2>
              <div className="space-y-3">
                {schedule.time_blocks.map((block, index) => (
                  <div
                    key={block.id}
                    className={`border p-4 rounded-xl ${getPriorityColor(block.priority)} ${
                      block.completed ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-label-mono text-label-mono text-xs uppercase">
                            {formatTime(block.start_time)} - {formatTime(block.end_time)}
                          </span>
                          <span className={`text-xs ${getEnergyColor(block.energy_requirement)}`}>
                            {block.energy_requirement} energy
                          </span>
                        </div>
                        <h3 className="font-headline-md text-headline-md text-primary">
                          {block.goal_title}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          const updatedBlocks = [...schedule.time_blocks]
                          updatedBlocks[index] = { ...block, completed: !block.completed }
                          setSchedule({ ...schedule, time_blocks: updatedBlocks })
                        }}
                        className={`material-symbols-outlined ${
                          block.completed ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                        data-icon={block.completed ? 'check_circle' : 'radio_button_unchecked'}
                      >
                        {block.completed ? 'check_circle' : 'radio_button_unchecked'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                        {block.duration_minutes} minutes
                      </span>
                      {block.flexible && (
                        <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                          Flexible
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quick Actions */}
          <section>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/app/chat')}
                className="bg-surface border border-border p-4 rounded-xl text-left hover:border-primary transition-all"
              >
                <span className="material-symbols-outlined text-primary mb-2" data-icon="add">
                  add
                </span>
                <p className="font-body-md text-body-md text-primary">Add Time Block</p>
              </button>
              <button
                onClick={handleOptimize}
                className="bg-surface border border-border p-4 rounded-xl text-left hover:border-primary transition-all"
              >
                <span className="material-symbols-outlined text-primary mb-2" data-icon="auto_awesome">
                  auto_awesome
                </span>
                <p className="font-body-md text-body-md text-primary">Optimize Schedule</p>
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Optimization Modal */}
      {showOptimization && optimizationResult && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6">
            <h2 className="font-headline-lg text-headline-lg text-primary mb-4">
              Schedule Optimization
            </h2>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                  Confidence Score
                </span>
                <span className="font-label-mono text-label-mono text-primary text-xs">
                  {optimizationResult.confidence_score}%
                </span>
              </div>
              <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{ width: `${optimizationResult.confidence_score}%` }}
                />
              </div>
            </div>

            {optimizationResult.improvements?.length > 0 && (
              <div className="mb-4">
                <p className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-2">
                  Improvements
                </p>
                <ul className="space-y-2">
                  {optimizationResult.improvements.map((improvement: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-primary text-lg" data-icon="check">
                        check
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface">{improvement}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {optimizationResult.trade_offs?.length > 0 && (
              <div className="mb-4">
                <p className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-2">
                  Trade-offs
                </p>
                <ul className="space-y-2">
                  {optimizationResult.trade_offs.map((tradeOff: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-error text-lg" data-icon="warning">
                        warning
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface">{tradeOff}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowOptimization(false)}
                className="flex-1 bg-surface border border-border font-headline-md text-headline-md font-bold uppercase tracking-widest h-[56px] hover:border-primary transition-all cursor-pointer rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={applyOptimization}
                className="flex-1 bg-primary text-background font-headline-md text-headline-md font-bold uppercase tracking-widest h-[56px] hover:brightness-110 transition-all cursor-pointer rounded-xl"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
