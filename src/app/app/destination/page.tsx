'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { getActiveRoadmap, getWeekTasks, getTodaysTask, getUserStats, getTaskCompletions } from '@/lib/data/goals'
import { aiService } from '@/lib/ai/ai-service'
import { computeSigmaScore, getTier, computeConfidenceInterval, computeCeiling } from '@/lib/sigma'
import { ArrowLeft, ArrowRight, Check, Play, X, Calendar, Trophy, Brain, ChevronRight, Target, TrendingUp, Zap, Award } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  if_then_plan: string | null
  estimated_minutes: number | null
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  scheduled_for: string | null
  stage?: { title: string; description: string | null; category: string | null }
}

export default function DestinationInsightsPage() {
  const router = useRouter()
  const { user, isGuest } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'destination' | 'insights'>('destination')
  const [roadmap, setRoadmap] = useState<any>(null)
  const [weekTasks, setWeekTasks] = useState<Task[]>([])
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [stats, setStats] = useState({ completed: 0, rate: 0, streak: 0, total: 0, daysActive: 1 })
  const [sigmaScore, setSigmaScore] = useState(500)
  const [sigmaTier, setSigmaTier] = useState({ tier: 'Novice', sub: 'Bronze', percentile: 95 })
  const [confidenceInterval, setConfidenceInterval] = useState<[number, number]>([450, 550])
  const [ceiling, setCeiling] = useState(600)
  const [aiInsight, setAiInsight] = useState<{ insight: string; suggestions: string[]; priority: string } | null>(null)
  const [dailyProgress, setDailyProgress] = useState<any[]>([])
  const [leaderboardPlace, setLeaderboardPlace] = useState(0)
  const [taskHistory, setTaskHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fadeIn, setFadeIn] = useState(false)

  useEffect(() => {
    loadData()
  }, [user, isGuest])

  useEffect(() => {
    if (!isLoading) setTimeout(() => setFadeIn(true), 50)
  }, [isLoading])

  const loadData = async () => {
    if (!user && !isGuest) { setIsLoading(false); return }
    try {
      setIsLoading(true)
      const userId = isGuest ? 'guest' : user?.id
      if (!userId) { setIsLoading(false); return }

      const [roadmapData, taskData, weekTasksData, statsData, completions] = await Promise.all([
        getActiveRoadmap(userId),
        getTodaysTask(userId),
        getWeekTasks(userId),
        getUserStats(userId),
        getTaskCompletions(userId, 30)
      ])

      setRoadmap(roadmapData)
      setCurrentTask(taskData)
      setWeekTasks(weekTasksData || [])
      setStats(statsData)
      setTaskHistory(completions || [])

      const theta = Math.log1p(statsData.completed) * 0.3 + (statsData.rate / 100) * 2 + Math.log1p(statsData.streak) * 0.5 - 1
      const score = computeSigmaScore(Math.max(-3, Math.min(8, theta)))
      const tier = getTier(score)
      setSigmaScore(score)
      setSigmaTier(tier)
      setConfidenceInterval(computeConfidenceInterval(theta, 0.5))
      setCeiling(computeCeiling(theta, 0.5))

      const simulatedScores = [2450, 2380, 2290, 2150, 2080, 1950, 1820, 1750]
      const userScore = statsData.completed * 100 + statsData.streak * 50
      for (let i = 0; i < simulatedScores.length; i++) {
        if (userScore >= simulatedScores[i]) { setLeaderboardPlace(i + 1); break }
        if (i === simulatedScores.length - 1) setLeaderboardPlace(simulatedScores.length + 1)
      }

      const days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        const dayTasks = (completions || []).filter((c: any) => new Date(c.completed_at || '').toISOString().split('T')[0] === dateStr)
        days.push({ date: dateStr, tasksCompleted: dayTasks.filter((t: any) => t.status === 'completed').length })
      }
      setDailyProgress(days)

      if (completions && completions.length > 0) {
        const dist: Record<string, number> = {}
        completions.forEach((c: any) => { const cat = c.task?.stage?.category || 'general'; dist[cat] = (dist[cat] || 0) + 1 })
        const insight = await aiService.getWhereToImprove(statsData, completions, dist)
        setAiInsight(insight)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      // Set defaults on error
      setStats({ completed: 0, rate: 0, streak: 0, total: 0, daysActive: 1 })
      setSigmaScore(500)
      setSigmaTier({ tier: 'Novice', sub: 'Bronze', percentile: 95 })
      setLeaderboardPlace(1)
      setDailyProgress(
        Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          return { date: d.toISOString().split('T')[0], tasksCompleted: 0 }
        })
      )
    } finally {
      setIsLoading(false)
    }
  }

  const getDayName = (dateStr: string | null, index: number) => {
    if (dateStr) return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const date = new Date(); date.setDate(date.getDate() + index)
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const isToday = (dateStr: string | null, index: number) => {
    if (dateStr) return new Date(dateStr).toDateString() === new Date().toDateString()
    if (index === 0) { const d = new Date(); d.setDate(d.getDate()); return d.toDateString() === new Date().toDateString() }
    return false
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => startTransition(() => router.back())} className="text-white hover:opacity-70">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Journey</h1>
          <div className="w-6" />
        </div>

        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('destination')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'destination' ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'}`}
          >
            Destination
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'insights' ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'}`}
          >
            Insights
          </button>
        </div>

        {activeTab === 'destination' && (
          <div>
            {roadmap && (
              <div className="bg-gray-900 border border-gray-800 p-6 mb-6 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">You are becoming</p>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{roadmap.destination.destination_text}</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="px-3 py-1 bg-gray-800 rounded-full">{roadmap.destination.duration}</span>
                  <span className="px-3 py-1 bg-gray-800 rounded-full capitalize">{roadmap.destination.complexity}</span>
                  <span className="text-gray-400">Goal: {roadmap.goal.title}</span>
                </div>
              </div>
            )}

            <h3 className="text-lg font-semibold text-white mb-4">This Week</h3>
            {weekTasks.length > 0 ? (
              <div className="space-y-3">
                {weekTasks.slice(0, 7).map((task, index) => (
                  <div key={task.id} className={`p-4 border rounded-lg ${isToday(task.scheduled_for, index) ? 'bg-white/10 border-white/20' : task.status === 'completed' ? 'bg-gray-900 border-gray-800 opacity-60' : 'bg-gray-900 border-gray-800'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-16 text-center">
                        <p className="text-xs text-gray-400">{isToday(task.scheduled_for, index) ? 'Today' : getDayName(task.scheduled_for, index).split(',')[0]}</p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {task.status === 'completed' && <Check size={16} className="text-green-500" />}
                          {task.status === 'skipped' && <X size={16} className="text-gray-500" />}
                          {task.status === 'pending' && <div className="w-4 h-4 rounded-full border border-gray-500" />}
                          <p className={`text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{task.title}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 border border-gray-800 bg-gray-900 rounded-lg text-center">
                <Calendar size={32} className="mx-auto text-gray-600 mb-2" />
                <p className="text-gray-400">No tasks scheduled</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div>
            <div className="bg-gray-900 border border-gray-800 p-6 mb-6 rounded-lg">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">{sigmaScore}</p>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 px-2 py-1 bg-white text-black text-xs font-bold rounded">#{leaderboardPlace}</div>
                </div>
              </div>
              <div className="text-center mb-4">
                <p className="text-xl font-semibold text-white">{sigmaTier.tier} {sigmaTier.sub}</p>
                <p className="text-sm text-gray-400">Top {sigmaTier.percentile}% of users</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Confidence:</span><span className="text-white">{confidenceInterval[0]} - {confidenceInterval[1]}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Ceiling:</span><span className="text-white">{ceiling}</span></div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-6 mb-6 rounded-lg">
              <h3 className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-4">This Week</h3>
              <div className="flex items-end justify-between h-32 gap-2">
                {dailyProgress.map((day, index) => {
                  const max = Math.max(...dailyProgress.map(d => d.tasksCompleted), 1)
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-gray-800 rounded-t relative" style={{ height: '80px', minHeight: '16px' }}>
                        <div className={`absolute bottom-0 w-full rounded-t ${index === dailyProgress.length - 1 ? 'bg-white' : 'bg-gray-500'}`} style={{ height: `${(day.tasksCompleted / max) * 100}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {aiInsight && (
              <div className="bg-gray-900 border border-gray-800 p-6 mb-6 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={20} className="text-white" />
                  <h3 className="text-sm font-mono text-gray-400 uppercase">AI Coaching</h3>
                  <span className={`ml-auto px-2 py-1 text-xs font-bold rounded ${aiInsight.priority === 'high' ? 'bg-red-500/20 text-red-400' : aiInsight.priority === 'medium' ? 'bg-white text-black' : 'bg-gray-700 text-gray-300'}`}>
                    {aiInsight.priority.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-300 mb-4">{aiInsight.insight}</p>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-400">Suggestions:</p>
                  {aiInsight.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2"><ChevronRight size={16} className="text-white mt-0.5" /><p className="text-sm text-gray-300">{s}</p></div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-900 border border-gray-800 p-4 text-center rounded-lg">
                <Target size={18} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xl font-bold text-white">{stats.completed}</p>
                <p className="text-xs text-gray-400">Done</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-4 text-center rounded-lg">
                <TrendingUp size={18} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xl font-bold text-white">{stats.rate}%</p>
                <p className="text-xs text-gray-400">Rate</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-4 text-center rounded-lg">
                <Zap size={18} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xl font-bold text-white">{stats.streak}</p>
                <p className="text-xs text-gray-400">Streak</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 p-4 text-center rounded-lg">
                <Award size={18} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xl font-bold text-white">{stats.daysActive || stats.total || 1}</p>
                <p className="text-xs text-gray-400">Days</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}