'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { getUserStats, getTaskCompletions, getAllGoals } from '@/lib/data/goals'
import { getGuestData } from '@/lib/data/guest-data'
import { aiService } from '@/lib/ai/ai-service'
import { computeSigmaScore, getTier, computeConfidenceInterval, computeCeiling } from '@/lib/sigma'
import { InsightsPageSkeleton } from '@/components/skeletons'
import { ArrowLeft, Brain, TrendingUp, Award, Target, Zap, ChevronRight } from 'lucide-react'

interface DailyProgress {
  date: string
  completionRate: number
  tasksCompleted: number
}

export default function InsightsPage() {
  const router = useRouter()
  const { user, isGuest } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [stats, setStats] = useState({ completed: 0, rate: 0, streak: 0, total: 0, daysActive: 1 })
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([])
  const [sigmaScore, setSigmaScore] = useState(500)
  const [sigmaTier, setSigmaTier] = useState({ tier: 'Novice', sub: 'Bronze', percentile: 95 })
  const [confidenceInterval, setConfidenceInterval] = useState<[number, number]>([450, 550])
  const [ceiling, setCeiling] = useState(600)
  const [aiInsight, setAiInsight] = useState<{ insight: string; suggestions: string[]; priority: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fadeIn, setFadeIn] = useState(false)
  const [taskHistory, setTaskHistory] = useState<any[]>([])
  const [categoryDist, setCategoryDist] = useState<Record<string, number>>({})
  const [leaderboardPlace, setLeaderboardPlace] = useState(0)

  useEffect(() => {
    loadData()
  }, [user, isGuest])

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => setFadeIn(true), 50)
    }
  }, [isLoading])

  const loadData = async () => {
    if (!user && !isGuest) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const userId = isGuest ? 'guest' : user?.id
      
      if (!userId) {
        setIsLoading(false)
        return
      }

      const [statsData, completions] = await Promise.all([
        getUserStats(userId),
        getTaskCompletions(userId, 30)
      ])

      setStats(statsData)
      setTaskHistory(completions || [])

      const theta = calculateThetaFromStats(statsData)
      const score = computeSigmaScore(theta)
      const tier = getTier(score)
      const ci = computeConfidenceInterval(theta, 0.5)
      const ceilingScore = computeCeiling(theta, 0.5)

      setSigmaScore(score)
      setSigmaTier(tier)
      setConfidenceInterval(ci)
      setCeiling(ceilingScore)

      const place = calculateLeaderboardPlace(score, statsData)
      setLeaderboardPlace(place)

      const progress = calculateDailyProgress(completions || [])
      setDailyProgress(progress)

      const dist = calculateCategoryDistribution(completions || [])
      setCategoryDist(dist)

      if (completions && completions.length > 0) {
        const insight = await aiService.getWhereToImprove(statsData, completions, dist)
        setAiInsight(insight)
      }
    } catch (err) {
      console.error('Failed to load insights:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateThetaFromStats = (stats: { completed: number; rate: number; streak: number; total: number }): number => {
    const baseTheta = Math.log1p(stats.completed) * 0.3
    const rateBonus = (stats.rate / 100) * 2
    const streakBonus = Math.log1p(stats.streak) * 0.5
    return Math.max(-3, Math.min(8, baseTheta + rateBonus + streakBonus - 1))
  }

  const calculateLeaderboardPlace = (score: number, stats: { completed: number; streak: number }): number => {
    const simulatedScores = [2450, 2380, 2290, 2150, 2080, 1950, 1820, 1750, 1680, 1600, 1520, 1450, 1380, 1310, 1240, 1170, 1100, 1030, 960, 890]
    const userScore = stats.completed * 100 + stats.streak * 50
    
    for (let i = 0; i < simulatedScores.length; i++) {
      if (userScore >= simulatedScores[i]) {
        return i + 1
      }
    }
    return simulatedScores.length + 1
  }

  const calculateDailyProgress = (completions: any[]): DailyProgress[] => {
    const days: DailyProgress[] = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayTasks = completions.filter((c: any) => {
        const compDate = new Date(c.completed_at || '').toISOString().split('T')[0]
        return compDate === dateStr
      })
      
      const completed = dayTasks.filter((t: any) => t.status === 'completed').length
      const total = dayTasks.length || 1
      
      days.push({
        date: dateStr,
        completionRate: Math.round((completed / total) * 100),
        tasksCompleted: completed
      })
    }
    
    return days
  }

  const calculateCategoryDistribution = (completions: any[]): Record<string, number> => {
    const dist: Record<string, number> = {}
    completions.forEach((c: any) => {
      const category = c.task?.stage?.category || 'general'
      dist[category] = (dist[category] || 0) + 1
    })
    return dist
  }

  const getMaxTasks = () => {
    return Math.max(...dailyProgress.map(d => d.tasksCompleted), 1)
  }

  if (isLoading) {
    return <InsightsPageSkeleton />
  }

  return (
    <div className={`min-h-screen bg-background transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-6">
        
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => startTransition(() => router.back())}
            className="text-white hover:opacity-70 transition-opacity"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Insights</h1>
          <div className="w-6" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="p-6 border border-gray-800 bg-gray-900 rounded-lg">
            <h2 className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-4">Your SIGMA Ranking</h2>
            
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-white flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-white">{sigmaScore}</p>
                    <p className="text-xs text-gray-400">score</p>
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 px-2 py-1 bg-white text-black text-xs font-bold rounded">
                  #{leaderboardPlace}
                </div>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="text-xl font-semibold text-white">{sigmaTier.tier} {sigmaTier.sub}</p>
              <p className="text-sm text-gray-400">Top {sigmaTier.percentile}% of users</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Confidence Range:</span>
                <span className="text-white">{confidenceInterval[0]} - {confidenceInterval[1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ceiling:</span>
                <span className="text-white">{ceiling}</span>
              </div>
            </div>
          </div>

          <div className="p-6 border border-gray-800 bg-gray-900 rounded-lg">
            <h2 className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-4">This Week</h2>
            
            <div className="flex items-end justify-between h-40 gap-2">
              {dailyProgress.map((day, index) => {
                const maxTasks = getMaxTasks()
                const heightPercent = (day.tasksCompleted / maxTasks) * 100
                const date = new Date(day.date)
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gray-800 rounded-t relative" style={{ height: '100px', minHeight: '20px' }}>
                      <div 
                        className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${
                          index === dailyProgress.length - 1 ? 'bg-white' : 'bg-gray-400'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{dayName}</p>
                    <p className="text-xs text-gray-500">{day.tasksCompleted}</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-400">Tasks completed</span>
              <span className="text-white font-semibold">{dailyProgress.reduce((sum, d) => sum + d.tasksCompleted, 0)}</span>
            </div>
          </div>
        </div>

        {aiInsight && (
          <div className="p-6 border border-gray-800 bg-gray-900 mb-8 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={20} className="text-white" />
              <h2 className="text-sm font-mono text-gray-400 uppercase tracking-widest">AI Coaching</h2>
              <span className={`ml-auto px-2 py-1 text-xs font-bold rounded ${
                aiInsight.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                aiInsight.priority === 'medium' ? 'bg-white text-black' :
                'bg-gray-700 text-gray-300'
              }`}>
                {aiInsight.priority.toUpperCase()} PRIORITY
              </span>
            </div>
            
            <p className="text-gray-300 mb-4">{aiInsight.insight}</p>
            
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-400">Suggestions:</p>
              {aiInsight.suggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-2">
                  <ChevronRight size={16} className="text-white mt-0.5" />
                  <p className="text-sm text-gray-300">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 border border-gray-800 bg-gray-900 text-center rounded-lg">
            <Target size={20} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-400 mb-1">Completed</p>
            <p className="text-2xl font-bold text-white">{stats.completed}</p>
          </div>
          <div className="p-4 border border-gray-800 bg-gray-900 text-center rounded-lg">
            <TrendingUp size={20} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-400 mb-1">Rate</p>
            <p className="text-2xl font-bold text-white">{stats.rate}%</p>
          </div>
          <div className="p-4 border border-gray-800 bg-gray-900 text-center rounded-lg">
            <Zap size={20} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-400 mb-1">Streak</p>
            <p className="text-2xl font-bold text-white">{stats.streak}</p>
          </div>
          <div className="p-4 border border-gray-800 bg-gray-900 text-center rounded-lg">
            <Award size={20} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-400 mb-1">Days</p>
            <p className="text-2xl font-bold text-white">{stats.daysActive || stats.total}</p>
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm py-8">
          <p>Track your patterns. Understand your growth.</p>
        </div>
      </div>
    </div>
  )
}