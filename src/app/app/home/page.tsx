'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { getActiveRoadmap, getTodaysTask, getUserStats, completeTask } from '@/lib/data/goals'

interface Task {
  id: string
  title: string
  description: string | null
  if_then_plan: string | null
  difficulty_score: number | null
  estimated_minutes: number | null
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  stage?: {
    title: string
    description: string | null
    category: string | null
  }
}

interface RoadmapData {
  goal: {
    id: string
    title: string
    description: string | null
  }
  destination: {
    destination_text: string
    duration: string
    complexity: 'low' | 'medium' | 'high'
    reason: string
  }
  roadmap: {
    id: string
    status: string
  }
  stages: Array<{
    id: string
    title: string
    description: string | null
    category: string | null
    sort_order: number
  }>
}

export default function Home() {
  const router = useRouter()
  const { user, isGuest } = useAuth()
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [todaysTask, setTodaysTask] = useState<Task | null>(null)
  const [stats, setStats] = useState({ completed: 0, rate: 0, streak: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [validationProof, setValidationProof] = useState('')

  useEffect(() => {
    loadData()
  }, [user, isGuest])

  const loadData = async () => {
    const userId = user?.id || 'guest';
    const guestMode = !user && isGuest;

    if (!user && !guestMode) {
      setError('Not authenticated')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const [roadmapData, taskData, statsData] = await Promise.all([
        getActiveRoadmap(userId),
        getTodaysTask(userId),
        getUserStats(userId)
      ])

      setRoadmap(roadmapData)
      setTodaysTask(taskData)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load your progress')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!todaysTask || !validationProof.trim() || !user) return

    try {
      await completeTask(user.id, todaysTask.id, {
        status: 'completed',
        what_helped: validationProof,
        what_got_in_way: '',
        energy_level: 3
      })
      setShowValidation(false)
      setValidationProof('')
      loadData()
    } catch (err) {
      console.error('Failed to complete task:', err)
      setError('Failed to save completion')
    }
  }

  const handleSkip = async (reason: string) => {
    if (!todaysTask || !user) return

    try {
      await completeTask(user.id, todaysTask.id, {
        status: 'skipped',
        what_helped: '',
        what_got_in_way: reason,
        energy_level: 1
      })
      setShowValidation(false)
      setValidationProof('')
      loadData()
    } catch (err) {
      console.error('Failed to skip task:', err)
      setError('Failed to save skip')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !roadmap) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-primary mb-4">Unable to load</h1>
          <p className="text-on-surface-variant font-body-md mb-6">{error}</p>
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full py-4 bg-primary text-background font-headline-md font-bold uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer rounded-2xl"
          >
            Set up your goal
          </button>
        </div>
      </div>
    )
  }

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center">
          <h1 className="text-3xl font-bold text-primary mb-4">No active goal</h1>
          <p className="text-on-surface-variant font-body-md mb-12">Set a goal to start tracking your progress.</p>
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full py-4 bg-primary text-background font-headline-md font-bold uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer rounded-2xl"
          >
            Create your first goal
          </button>
        </div>
      </div>
    )
  }

  const currentStage = roadmap.stages[0]
  const progressPercent = roadmap.stages.length > 0 
    ? Math.round((roadmap.stages.filter(s => s.sort_order < (currentStage?.sort_order || 1)).length / roadmap.stages.length) * 100)
    : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-6">
        
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6">Today's Mission</h1>
          
          <p className="text-xl text-on-surface-variant mb-4">
            You are becoming {roadmap.destination.destination_text}.
          </p>
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-on-surface-variant mb-6">
            <span>Day {stats.total + 1}</span>
            <span>Streak: {stats.streak} days</span>
            <span>Completion: {stats.rate}%</span>
          </div>

          <div className="w-full bg-surface h-[2px] mb-8">
            <div 
              className="bg-primary h-[2px] transition-all" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="space-y-2 text-sm text-on-surface-variant">
            <p><span className="text-on-surface-variant">Goal:</span> {roadmap.goal.title}</p>
            <p><span className="text-on-surface-variant">Current Phase:</span> {currentStage?.title || 'Foundation'}</p>
            <p><span className="text-on-surface-variant">Current Stage:</span> {currentStage?.description || 'Getting started'}</p>
            <p><span className="text-on-surface-variant">Destination:</span> {roadmap.destination.destination_text} ({roadmap.destination.duration})</p>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-semibold text-primary mb-6">Today's Task</h2>
          
          {todaysTask ? (
            <div
              className={`p-8 border ${
                todaysTask.status === 'completed'
                  ? 'bg-surface border-border opacity-60'
                  : 'bg-surface border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className={`text-xl font-semibold mb-3 ${todaysTask.status === 'completed' ? 'text-on-surface-variant line-through' : 'text-primary'}`}>
                    {todaysTask.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-on-surface-variant mb-6">
                    <p>Time: {todaysTask.estimated_minutes ? `${todaysTask.estimated_minutes} min` : '~15 min'}</p>
                    <p>Difficulty: {todaysTask.difficulty_score ? (todaysTask.difficulty_score <= 3 ? 'Easy' : todaysTask.difficulty_score <= 6 ? 'Medium' : 'Hard') : 'Unknown'}</p>
                    <p>Phase: {currentStage?.category || 'general'}</p>
                  </div>
                  
                  {todaysTask.if_then_plan && (
                    <div className="p-4 bg-surface-container-low border border-border mb-4">
                      <p className="text-xs text-on-surface-variant mb-1">If-Then Plan:</p>
                      <p className="text-primary font-body-md">{todaysTask.if_then_plan}</p>
                    </div>
                  )}
                  
                  {todaysTask.description && (
                    <div className="p-4 bg-surface-container-low border border-border">
                      <p className="text-xs text-on-surface-variant mb-1">Details:</p>
                      <p className="text-primary">{todaysTask.description}</p>
                    </div>
                  )}
                </div>
                
                {todaysTask.status === 'pending' || todaysTask.status === 'in_progress' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowValidation(true)}
                      className="px-6 py-3 bg-primary text-background font-semibold hover:brightness-110 transition-all cursor-pointer rounded-2xl"
                    >
                      Start
                    </button>
                    <button
                      onClick={() => handleSkip('User skipped')}
                      className="px-6 py-3 bg-surface border border-border text-primary font-semibold hover:border-primary transition-colors cursor-pointer"
                    >
                      Skip
                    </button>
                  </div>
                ) : todaysTask.status === 'completed' ? (
                  <div className="text-primary text-xl font-bold">Done</div>
                ) : (
                  <div className="text-on-surface-variant text-lg">Skipped</div>
                )}
              </div>
              
              {showValidation && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-on-surface-variant mb-3">Provide proof of completion:</p>
                  <textarea
                    value={validationProof}
                    onChange={(e) => setValidationProof(e.target.value)}
                    placeholder="GitHub commit link, screenshot, or explanation..."
                    className="w-full bg-surface-container-low border border-border px-4 py-3 text-primary placeholder:text-on-surface-variant focus:border-border-light focus:outline-none cursor-text resize-none"
                    rows={3}
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleComplete}
                      disabled={!validationProof.trim()}
                      className="flex-1 py-3 bg-primary text-background font-semibold hover:brightness-110 transition-all cursor-pointer rounded-2xl"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => { setShowValidation(false); setValidationProof(''); handleSkip('User skipped') }}
                      className="flex-1 py-3 bg-surface border border-border text-primary font-semibold hover:border-primary transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 border border-border bg-surface text-center">
              <p className="text-on-surface-variant">No task scheduled for today.</p>
              <p className="text-sm text-on-surface-variant mt-2">Visit the Actions page to generate one.</p>
            </div>
          )}
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-semibold text-primary mb-6">Your Progress</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 border border-border bg-surface text-center">
              <p className="text-sm text-on-surface-variant mb-1">Tasks Completed</p>
              <p className="text-3xl font-bold text-primary">{stats.completed}</p>
            </div>
            <div className="p-6 border border-border bg-surface text-center">
              <p className="text-sm text-on-surface-variant mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-primary">{stats.rate}%</p>
            </div>
            <div className="p-6 border border-border bg-surface text-center">
              <p className="text-sm text-on-surface-variant mb-1">Current Streak</p>
              <p className="text-3xl font-bold text-primary">{stats.streak} days</p>
            </div>
            <div className="p-6 border border-border bg-surface text-center">
              <p className="text-sm text-on-surface-variant mb-1">Total Actions</p>
              <p className="text-3xl font-bold text-primary">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="text-center text-on-surface-variant text-sm py-8">
          <p>Is your behavior aligned with the person you want to become?</p>
        </div>
      </div>
    </div>
  )
}