'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MultiGoalDashboard, Goal } from '@/lib/goals/multi-goal-dashboard'

export default function GoalsPage() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [userPreferences, setUserPreferences] = useState({
    available_hours_per_day: 4,
    preferred_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    peak_energy_times: ['morning'],
    current_focus: null,
  })

  const dashboard = new MultiGoalDashboard()

  // Mock goals data - in production this would come from the database
  const mockGoals: Goal[] = [
    {
      id: 'goal_1',
      title: 'Learn TypeScript',
      description: 'Master TypeScript fundamentals and advanced types',
      status: 'active',
      priority_score: 85,
      progress: 45,
      last_activity: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date(Date.now() - 604800000).toISOString(),
      target_completion_date: new Date(Date.now() + 2592000000).toISOString(),
    },
    {
      id: 'goal_2',
      title: 'Build Portfolio',
      description: 'Create 3 high-quality projects for job applications',
      status: 'active',
      priority_score: 72,
      progress: 20,
      last_activity: new Date(Date.now() - 172800000).toISOString(),
      created_at: new Date(Date.now() - 1209600000).toISOString(),
      target_completion_date: new Date(Date.now() + 5184000000).toISOString(),
    },
    {
      id: 'goal_3',
      title: 'Exercise Regularly',
      description: 'Exercise 4 times per week for overall health',
      status: 'active',
      priority_score: 65,
      progress: 60,
      last_activity: new Date(Date.now() - 43200000).toISOString(),
      created_at: new Date(Date.now() - 2592000000).toISOString(),
      target_completion_date: null,
    },
  ]

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const data = await dashboard.generateDashboardData('user_123', mockGoals, userPreferences)
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-error'
    if (score >= 60) return 'text-primary'
    return 'text-on-surface-variant'
  }

  const getPriorityLabel = (score: number) => {
    if (score >= 80) return 'HIGH'
    if (score >= 60) return 'MEDIUM'
    return 'LOW'
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
          <span className="font-label-mono text-label-mono tracking-widest text-primary">Goals</span>
          <button
            onClick={() => router.push('/app/chat')}
            className="material-symbols-outlined text-primary"
            data-icon="add"
          >
            add
          </button>
        </nav>
      </header>

      <main className="pt-24 pb-32 px-grid-margin min-h-screen">
        <div className="max-w-[640px] mx-auto">
          {/* Overall Progress */}
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest">
                  Overall Progress
                </h2>
                <span className="font-headline-lg text-headline-lg text-primary">
                  {Math.round(dashboardData?.overall_progress || 0)}%
                </span>
              </div>
              <div className="w-full bg-surface-variant h-3 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-500"
                  style={{ width: `${dashboardData?.overall_progress || 0}%` }}
                />
              </div>
            </div>
          </section>

          {/* AI Insights */}
          {dashboardData?.ai_insights && dashboardData.ai_insights.length > 0 && (
            <section className="mb-stack-lg">
              <div className="bg-surface border border-border p-6">
                <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                  AI Insights
                </h2>
                <div className="space-y-3">
                  {dashboardData.ai_insights.map((insight: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-xl" data-icon="lightbulb">
                        lightbulb
                      </span>
                      <p className="font-body-md text-body-md text-on-surface">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Conflicts */}
          {dashboardData?.conflicts_detected && dashboardData.conflicts_detected.length > 0 && (
            <section className="mb-stack-lg">
              <div className="bg-error-container border border-error p-6">
                <h2 className="font-label-mono text-label-mono text-on-error-container uppercase tracking-widest mb-4">
                  Conflicts Detected
                </h2>
                <div className="space-y-3">
                  {dashboardData.conflicts_detected.map((conflict: any, index: number) => (
                    <div key={index} className="bg-error p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-on-error" data-icon="warning">
                          warning
                        </span>
                        <span className="font-label-mono text-label-mono text-on-error uppercase">
                          {conflict.severity}
                        </span>
                      </div>
                      <p className="font-body-md text-body-md text-on-error mb-2">{conflict.description}</p>
                      <p className="font-body-sm text-body-sm text-on-error-variant">
                        Suggestion: {conflict.suggested_resolution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Prioritized Goals */}
          <section className="mb-stack-lg">
            <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
              Prioritized Goals
            </h2>
            <div className="space-y-4">
              {dashboardData?.prioritized_goals?.map((priority: any, index: number) => {
                const goal = mockGoals.find(g => g.id === priority.goal_id)
                if (!goal) return null

                return (
                  <div
                    key={priority.goal_id}
                    className="bg-surface border border-border p-6 cursor-pointer hover:border-primary transition-all"
                    onClick={() => setSelectedGoal(selectedGoal === priority.goal_id ? null : priority.goal_id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-label-mono text-label-mono text-primary">
                            #{index + 1}
                          </span>
                          <span
                            className={`font-label-mono text-label-mono ${getPriorityColor(
                              priority.priority_score
                            )}`}
                          >
                            {getPriorityLabel(priority.priority_score)}
                          </span>
                        </div>
                        <h3 className="font-headline-md text-headline-md text-primary mb-1">
                          {goal.title}
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {goal.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-headline-lg text-headline-lg text-primary">
                          {priority.priority_score}
                        </span>
                        <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                          Priority Score
                        </p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          Progress
                        </span>
                        <span className="font-body-sm text-body-sm text-primary">{goal.progress}%</span>
                      </div>
                      <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-500"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    {selectedGoal === priority.goal_id && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <div>
                          <p className="font-label-mono text-label-mono text-on-surface-variant mb-1">
                            Priority Reason
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface">
                            {priority.priority_reason}
                          </p>
                        </div>
                        <div>
                          <p className="font-label-mono text-label-mono text-on-surface-variant mb-1">
                            Time Allocation
                          </p>
                          <p className="font-body-sm text-body-sm text-primary">
                            {priority.time_allocation_percentage}% of available time
                          </p>
                        </div>
                        {priority.dependencies && priority.dependencies.length > 0 && (
                          <div>
                            <p className="font-label-mono text-label-mono text-on-surface-variant mb-1">
                              Dependencies
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {priority.dependencies.map((dep: string, depIndex: number) => (
                                <span
                                  key={depIndex}
                                  className="bg-surface-variant px-3 py-1 rounded-full font-body-sm text-body-sm text-on-surface-variant"
                                >
                                  {dep}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {/* Schedule Suggestions */}
          {dashboardData?.suggested_schedule && dashboardData.suggested_schedule.length > 0 && (
            <section className="mb-stack-lg">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Suggested Schedule
              </h2>
              <div className="space-y-3">
                {dashboardData.suggested_schedule.map((schedule: any, index: number) => (
                  <div key={index} className="bg-surface border border-border p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-headline-md text-headline-md text-primary">
                        {schedule.day_of_week}
                      </h3>
                      <span className="font-label-mono text-label-mono text-on-surface-variant">
                        {Math.round(schedule.total_minutes / 60)}h {schedule.total_minutes % 60}m
                      </span>
                    </div>
                    <div className="space-y-2">
                      {schedule.goals.map((goalSchedule: any, goalIndex: number) => (
                        <div key={goalIndex} className="flex items-center gap-3 text-sm">
                          <span className="material-symbols-outlined text-primary" data-icon="schedule">
                            schedule
                          </span>
                          <span className="font-body-md text-body-md text-on-surface flex-1">
                            {goalSchedule.goal_title}
                          </span>
                          <span className="font-label-mono text-label-mono text-on-surface-variant">
                            {goalSchedule.suggested_time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Time Allocation Summary */}
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Time Allocation
              </h2>
              <div className="space-y-3">
                {Object.entries(dashboardData?.time_allocation || {}).map(([goalId, minutes]: [string, any]) => {
                  const goal = mockGoals.find(g => g.id === goalId)
                  if (!goal) return null

                  return (
                    <div key={goalId} className="flex justify-between items-center">
                      <span className="font-body-md text-body-md text-on-surface">{goal.title}</span>
                      <span className="font-label-mono text-label-mono text-primary">
                        {Math.round(minutes / 60)}h {minutes % 60}m
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <button
            onClick={() => router.push('/app/chat')}
            className="w-full bg-primary text-background font-headline-md text-headline-md font-bold uppercase tracking-widest h-[64px] hover:brightness-110 transition-all cursor-pointer rounded-2xl"
          >
            Get AI Recommendations
          </button>
        </div>
      </main>
    </div>
  )
}
