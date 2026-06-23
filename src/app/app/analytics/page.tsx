'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnalyticsService, AnalyticsDashboard, AnalyticsMetric } from '@/lib/analytics/analytics-service'

export default function AnalyticsPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [dashboardData, setDashboardData] = useState<AnalyticsDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)

  const analyticsService = new AnalyticsService()

  useEffect(() => {
    loadDashboardData()
  }, [period])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const data = await analyticsService.getDashboardData('user_123', period)
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadReport = async (reportType: string) => {
    try {
      const report = await analyticsService.getDetailedReport('user_123', reportType)
      setReportData(report)
      setSelectedReport(reportType)
    } catch (error) {
      console.error('Failed to load report:', error)
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'trending_up'
      case 'down':
        return 'trending_down'
      default:
        return 'trending_flat'
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-primary'
      case 'down':
        return 'text-error'
      default:
        return 'text-on-surface-variant'
    }
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
          <span className="font-label-mono text-label-mono tracking-widest text-primary">Analytics</span>
          <button
            onClick={() => router.push('/app/chat')}
            className="material-symbols-outlined text-primary"
            data-icon="insights"
          >
            insights
          </button>
        </nav>
      </header>

      <main className="pt-24 pb-32 px-grid-margin min-h-screen">
        <div className="max-w-[640px] mx-auto">
          {/* Period Selector */}
          <section className="mb-stack-lg">
            <div className="flex gap-2">
              {(['week', 'month', 'quarter', 'year'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 py-2 px-4 font-label-mono text-label-mono text-center rounded-lg transition-all ${
                    period === p
                      ? 'bg-primary text-background'
                      : 'bg-surface text-on-surface-variant border border-border'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </section>

          {/* Overview Metrics */}
          <section className="mb-stack-lg">
            <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
              Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {dashboardData?.overview_metrics.map((metric: AnalyticsMetric) => (
                <div key={metric.id} className="bg-surface border border-border p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-label-mono text-label-mono text-on-surface-variant">
                      {metric.name}
                    </span>
                    <span
                      className={`material-symbols-outlined text-sm ${getTrendColor(metric.trend)}`}
                      data-icon={getTrendIcon(metric.trend)}
                    >
                      {getTrendIcon(metric.trend)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-headline-lg text-headline-lg text-primary">
                      {metric.value}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {metric.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`font-label-mono text-label-mono text-xs ${
                        metric.change > 0 ? 'text-primary' : 'text-error'
                      }`}
                    >
                      {metric.change > 0 ? '+' : ''}
                      {metric.change}%
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                      vs last {period}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Completion Trends */}
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Completion Trends
              </h2>
              <div className="h-48 flex items-end gap-1">
                {dashboardData?.completion_trends.slice(-14).map((data, index) => {
                  const maxValue = Math.max(...dashboardData.completion_trends.map(d => d.value))
                  const height = (data.value / maxValue) * 100
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary rounded-t transition-all hover:opacity-80"
                        style={{ height: `${height}%` }}
                      />
                      <span className="font-label-mono text-label-mono text-on-surface-variant text-xs">
                        {data.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Productivity Patterns */}
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Productivity Patterns
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface">Best Time of Day</span>
                  <span className="font-label-mono text-label-mono text-primary">
                    {dashboardData?.productivity_patterns.best_time_of_day}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface">Best Day of Week</span>
                  <span className="font-label-mono text-label-mono text-primary">
                    {dashboardData?.productivity_patterns.best_day_of_week}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface">Avg Session Length</span>
                  <span className="font-label-mono text-label-mono text-primary">
                    {dashboardData?.productivity_patterns.average_session_length} min
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface">Peak Hours</span>
                  <div className="flex gap-2">
                    {dashboardData?.productivity_patterns.peak_productivity_hours.map((hour, index) => (
                      <span
                        key={index}
                        className="bg-primary-container text-on-primary-container px-2 py-1 rounded-full font-label-mono text-label-mono text-xs"
                      >
                        {hour}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Goal Performance */}
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Goal Performance
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <span className="font-headline-lg text-headline-lg text-primary">
                    {dashboardData?.goal_performance.total_goals}
                  </span>
                  <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">Total Goals</p>
                </div>
                <div className="text-center">
                  <span className="font-headline-lg text-headline-lg text-primary">
                    {dashboardData?.goal_performance.completed_goals}
                  </span>
                  <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">Completed</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">Goal Categories</p>
                <div className="space-y-2">
                  {Object.entries(dashboardData?.goal_performance.goal_categories || {}).map(
                    ([category, count]) => (
                      <div key={category} className="flex justify-between items-center">
                        <span className="font-body-md text-body-md text-on-surface capitalize">
                          {category}
                        </span>
                        <span className="font-label-mono text-label-mono text-primary">{count}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
              <button
                onClick={() => loadReport('goals')}
                className="w-full bg-surface-variant text-on-surface-variant font-label-mono text-label-mono py-2 rounded-lg border border-border"
              >
                View Detailed Report
              </button>
            </div>
          </section>

          {/* Task Analytics */}
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Task Analytics
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <span className="font-headline-lg text-headline-lg text-primary">
                    {dashboardData?.task_analytics.completion_rate}%
                  </span>
                  <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">Completion Rate</p>
                </div>
                <div className="text-center">
                  <span className="font-headline-lg text-headline-lg text-primary">
                    {dashboardData?.task_analytics.average_difficulty}/10
                  </span>
                  <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">Avg Difficulty</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">Difficulty Distribution</p>
                <div className="space-y-2">
                  {Object.entries(dashboardData?.task_analytics.difficulty_distribution || {}).map(
                    ([difficulty, count]) => (
                      <div key={difficulty} className="flex justify-between items-center">
                        <span className="font-body-md text-body-md text-on-surface capitalize">
                          {difficulty}
                        </span>
                        <span className="font-label-mono text-label-mono text-primary">{count} tasks</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Cognitive Insights */}
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Cognitive Insights
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface">Average Load</span>
                  <span className="font-label-mono text-label-mono text-primary">
                    {dashboardData?.cognitive_insights.average_cognitive_load}/100
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface">Recovery Time</span>
                  <span className="font-label-mono text-label-mono text-primary">
                    {dashboardData?.cognitive_insights.recovery_time_average} min
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface">Assessments</span>
                  <span className="font-label-mono text-label-mono text-primary">
                    {dashboardData?.cognitive_insights.assessment_frequency}
                  </span>
                </div>
                {dashboardData?.cognitive_insights.high_load_periods && dashboardData.cognitive_insights.high_load_periods.length > 0 && (
                  <div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">High Load Periods</p>
                    <div className="flex flex-wrap gap-2">
                      {dashboardData.cognitive_insights.high_load_periods.map((period, index) => (
                        <span
                          key={index}
                          className="bg-error-container text-on-error-container px-2 py-1 rounded-full font-label-mono text-label-mono text-xs"
                        >
                          {period}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Behavior Patterns */}
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Behavior Patterns
              </h2>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-body-md text-body-md text-on-surface">Consistency Score</span>
                  <span className="font-headline-lg text-headline-lg text-primary">
                    {dashboardData?.behavior_patterns.consistency_score}%
                  </span>
                </div>
                <div className="w-full bg-surface-variant h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${dashboardData?.behavior_patterns.consistency_score || 0}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">Barriers</p>
                  <div className="space-y-1">
                    {Object.entries(dashboardData?.behavior_patterns.barrier_frequency || {}).map(
                      ([barrier, count]) => (
                        <div key={barrier} className="flex justify-between items-center text-sm">
                          <span className="font-body-md text-body-md text-on-surface capitalize">
                            {barrier}
                          </span>
                          <span className="font-label-mono text-label-mono text-error">{count}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">Facilitators</p>
                  <div className="space-y-1">
                    {Object.entries(dashboardData?.behavior_patterns.facilitator_frequency || {}).map(
                      ([facilitator, count]) => (
                        <div key={facilitator} className="flex justify-between items-center text-sm">
                          <span className="font-body-md text-body-md text-on-surface capitalize">
                            {facilitator}
                          </span>
                          <span className="font-label-mono text-label-mono text-primary">{count}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => loadReport('behavior')}
                className="w-full mt-4 bg-surface-variant text-on-surface-variant font-label-mono text-label-mono py-2 rounded-lg border border-border"
              >
                View Behavior Report
              </button>
            </div>
          </section>

          {/* Learning Progress */}
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Learning Progress
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <span className="font-headline-lg text-headline-lg text-primary">
                    {dashboardData?.learning_progress.quiz_pass_rate}%
                  </span>
                  <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">Quiz Pass Rate</p>
                </div>
                <div className="text-center">
                  <span className="font-headline-lg text-headline-lg text-primary">
                    {dashboardData?.learning_progress.quiz_attempts}
                  </span>
                  <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">Quiz Attempts</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">Skills Developing</p>
                <div className="flex flex-wrap gap-2">
                  {dashboardData?.learning_progress.skill_development.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full font-body-md text-body-md"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => loadReport('learning')}
                className="w-full bg-surface-variant text-on-surface-variant font-label-mono text-label-mono py-2 rounded-lg border border-border"
              >
                View Learning Report
              </button>
            </div>
          </section>

          {/* Report Modal */}
          {selectedReport && reportData && (
            <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
              <div className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-headline-lg text-headline-lg text-primary">{reportData.title}</h3>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="material-symbols-outlined text-primary"
                    data-icon="close"
                  >
                    close
                  </button>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                  {reportData.summary}
                </p>
                <div className="mb-4">
                  <h4 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-2">
                    Key Insights
                  </h4>
                  <ul className="space-y-2">
                    {reportData.key_insights.map((insight: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-primary text-sm" data-icon="check_circle">
                          check_circle
                        </span>
                        <span className="font-body-md text-body-md text-on-surface">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-2">
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {reportData.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-primary text-sm" data-icon="arrow_right">
                          arrow_right
                        </span>
                        <span className="font-body-md text-body-md text-on-surface">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
