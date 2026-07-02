'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { getActiveRoadmap, getTodaysTask, getUserStats, completeTask } from '@/lib/data/goals'
import { HomePageSkeleton } from '@/components/skeletons'
import { Check, X, Play, SkipForward, CheckCircle, XCircle, ChevronRight, ArrowRight, User, Trophy } from 'lucide-react'

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

interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  streak: number
  isCurrentUser: boolean
}

export default function Home() {
  const router = useRouter()
  const { user, isGuest, upgradeToAccount } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [todaysTask, setTodaysTask] = useState<Task | null>(null)
  const [stats, setStats] = useState({ completed: 0, rate: 0, streak: 0, total: 0, daysActive: 0 })
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showValidation, setShowValidation] = useState(false)
  const [validationProof, setValidationProof] = useState('')
  const [showSkipPopup, setShowSkipPopup] = useState(false)
  const [skipReason, setSkipReason] = useState<'already_know' | 'not_interested' | 'other' | null>(null)
  const [skipCustomReason, setSkipCustomReason] = useState('')
  const [showIntellectualTest, setShowIntellectualTest] = useState(false)
  const [testQuestions, setTestQuestions] = useState<any[]>([])
  const [testAnswers, setTestAnswers] = useState<Record<number, number>>({})
  const [fadeIn, setFadeIn] = useState(false)

  useEffect(() => {
    loadData()
  }, [user, isGuest])

  useEffect(() => {
    if (!isLoading) {
      setFadeIn(true)
    }
  }, [isLoading])

  const loadData = async () => {
    if (!user && !isGuest) {
      setError('Not authenticated')
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
      
      const [roadmapData, taskData, statsData] = await Promise.all([
        getActiveRoadmap(userId),
        getTodaysTask(userId),
        getUserStats(userId)
      ])

      setRoadmap(roadmapData)
      setTodaysTask(taskData)
      setStats(statsData)
      
      const leaderboardData = generateLeaderboard(isGuest ? 'Guest User' : user?.email?.split('@')[0] || 'User', stats)
      setLeaderboard(leaderboardData)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError('Failed to load your progress')
    } finally {
      setIsLoading(false)
    }
  }

  const generateLeaderboard = (userName: string, userStats: any): LeaderboardEntry[] => {
    const simulatedUsers = [
      { name: 'Alex Chen', score: 2450, streak: 15 },
      { name: 'Sarah Miller', score: 2380, streak: 12 },
      { name: 'Jordan Lee', score: 2290, streak: 8 },
      { name: 'Taylor Smith', score: 2150, streak: 10 },
      { name: 'Casey Brown', score: 2080, streak: 6 },
      { name: 'Morgan Davis', score: 1950, streak: 5 },
      { name: 'Riley Wilson', score: 1820, streak: 4 },
      { name: 'Jamie Taylor', score: 1750, streak: 3 },
    ]

    const userScore = userStats.completed * 100 + userStats.streak * 50
    const userEntry: LeaderboardEntry = {
      rank: 0,
      name: userName,
      score: userScore,
      streak: userStats.streak,
      isCurrentUser: true
    }

    const allEntries = [...simulatedUsers.map(u => ({ ...u, isCurrentUser: false })), userEntry]
    allEntries.sort((a, b) => b.score - a.score)
    
    return allEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))
  }

  const handleComplete = async () => {
    if (!todaysTask || !validationProof.trim() || (!user && !isGuest)) return

    try {
      const userId = isGuest ? 'guest' : user?.id
      if (!userId) return
      
      await completeTask(userId, todaysTask.id, {
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
    if (!todaysTask || (!user && !isGuest)) return

    try {
      const userId = isGuest ? 'guest' : user?.id
      if (!userId) return
      
      await completeTask(userId, todaysTask.id, {
        status: 'skipped',
        what_helped: '',
        what_got_in_way: reason,
        energy_level: 1
      })
      setShowValidation(false)
      setShowSkipPopup(false)
      setSkipReason(null)
      setSkipCustomReason('')
      setValidationProof('')
      loadData()
    } catch (err) {
      console.error('Failed to skip task:', err)
      setError('Failed to save skip')
    }
  }

  const handleSkipClick = () => {
    setShowSkipPopup(true)
    setSkipReason(null)
    setSkipCustomReason('')
  }

  const handleSkipOptionSelect = async (reason: 'already_know' | 'not_interested' | 'other') => {
    setSkipReason(reason)
    
    if (reason === 'already_know') {
      const isIntellectual = todaysTask?.title.toLowerCase().includes('book') ||
        todaysTask?.title.toLowerCase().includes('study') ||
        todaysTask?.title.toLowerCase().includes('read') ||
        todaysTask?.title.toLowerCase().includes('learn') ||
        todaysTask?.title.toLowerCase().includes('course')
      
      if (isIntellectual) {
        setShowIntellectualTest(true)
        setTestQuestions([
          { id: 1, question: 'What was the main concept covered in this task?', options: ['Recall', 'Understand', 'Apply', 'Analyze'], correct: 0 },
          { id: 2, question: 'How confident are you about this topic?', options: ['Very confident', 'Somewhat confident', 'Unsure', 'No idea'], correct: 0 },
          { id: 3, question: 'Have you completed similar tasks before?', options: ['Yes, many times', 'A few times', 'Once or twice', 'Never'], correct: 0 },
          { id: 4, question: 'Did you understand the material?', options: ['Completely', 'Mostly', 'Partially', 'Not at all'], correct: 0 },
          { id: 5, question: 'Can you explain this to someone else?', options: ['Easily', 'With some effort', 'With difficulty', 'No'], correct: 0 },
        ])
        return
      }
    }
    
    if (reason === 'not_interested') {
      await handleSkip('Not interested')
    }
  }

  const handleSkipCustomSubmit = async () => {
    if (skipCustomReason.trim()) {
      await handleSkip(skipCustomReason)
    }
  }

  const handleIntellectualTestSubmit = async () => {
    await handleSkip(`Intellectual test completed - Already know this topic`)
  }

  if (isLoading) {
    return <HomePageSkeleton />
  }

  if (error && !roadmap) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center transition-opacity duration-300">
          <h1 className="text-3xl font-bold text-white mb-4">Unable to load</h1>
          <p className="text-gray-400 font-body-md mb-6">{error}</p>
          <button
            onClick={() => startTransition(() => router.push('/onboarding'))}
            className="w-full py-4 bg-white text-black font-headline-md font-bold uppercase tracking-widest hover:brightness-90 transition-all cursor-pointer rounded-2xl"
          >
            Create your first goal
          </button>
        </div>
      </div>
    )
  }

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center transition-opacity duration-300">
          <h1 className="text-3xl font-bold text-white mb-4">No active goal</h1>
          <p className="text-gray-400 font-body-md mb-12">Set a goal to start tracking your progress.</p>
          <button
            onClick={() => startTransition(() => router.push('/onboarding'))}
            className="w-full py-4 bg-white text-black font-headline-md font-bold uppercase tracking-widest hover:brightness-90 transition-all cursor-pointer rounded-2xl"
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
    <div className={`min-h-screen bg-background transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-6">
        
        {isGuest && (
          <div className="mb-6 p-4 bg-gray-900 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={18} className="text-white" />
                <p className="text-sm text-gray-400">
                  You're in guest mode. Your data is stored locally on this device.
                </p>
              </div>
              <button
                onClick={upgradeToAccount}
                className="text-sm text-white hover:underline font-medium"
              >
                Create account
              </button>
            </div>
          </div>
        )}
        
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Today's Mission</h1>
          
          <p className="text-xl text-gray-400 mb-4">
            You are becoming {roadmap.destination.destination_text}.
          </p>
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 mb-6">
            <span>Day {stats.daysActive || stats.total}</span>
            <span>Streak: {stats.streak} days</span>
            <span>Completion: {stats.rate}%</span>
          </div>

          <div className="w-full bg-gray-800 h-[2px] mb-8">
            <div 
              className="bg-white h-[2px] transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="space-y-2 text-sm text-gray-400">
            <p><span className="text-gray-400">Goal:</span> {roadmap.goal.title}</p>
            <p><span className="text-gray-400">Current Phase:</span> {currentStage?.title || 'Foundation'}</p>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Today's Task</h2>
          
          {todaysTask ? (
            <div
              className={`p-8 border transition-all duration-300 ${
                todaysTask.status === 'completed'
                  ? 'bg-gray-900 border-border opacity-60'
                  : 'bg-gray-900 border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h3 className={`text-xl font-semibold mb-3 ${todaysTask.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                    {todaysTask.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-400 mb-6">
                    <p>Time: {todaysTask.estimated_minutes ? `${todaysTask.estimated_minutes} min` : '~15 min'}</p>
                    <p>Phase: {currentStage?.category || 'general'}</p>
                  </div>
                  
                  {todaysTask.if_then_plan && (
                    <div className="p-4 bg-gray-800 border border-border mb-4">
                      <p className="text-xs text-gray-500 mb-1">If-Then Plan:</p>
                      <p className="text-white font-body-md">{todaysTask.if_then_plan}</p>
                    </div>
                  )}
                  
                  {todaysTask.description && (
                    <div className="p-4 bg-gray-800 border border-border">
                      <p className="text-xs text-gray-500 mb-1">Details:</p>
                      <p className="text-white">{todaysTask.description}</p>
                    </div>
                  )}
                </div>
                
                {todaysTask.status === 'pending' || todaysTask.status === 'in_progress' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowValidation(true)}
                      className="px-6 py-3 bg-white text-black font-semibold hover:brightness-90 transition-all cursor-pointer rounded-2xl flex items-center gap-2"
                    >
                      <Play size={18} />
                      Start
                    </button>
                    <button
                      onClick={handleSkipClick}
                      className="px-6 py-3 bg-gray-800 border border-gray-700 text-white font-semibold hover:border-gray-500 transition-colors cursor-pointer"
                    >
                      Skip
                    </button>
                  </div>
                ) : todaysTask.status === 'completed' ? (
                  <div className="text-white text-xl font-bold flex items-center gap-2">
                    <Check size={24} /> Done
                  </div>
                ) : (
                  <div className="text-gray-500 text-lg">Skipped</div>
                )}
              </div>
              
              {showValidation && (
                <div className="mt-6 pt-6 border-t border-gray-800">
                  <p className="text-sm text-gray-400 mb-3">Provide proof of completion:</p>
                  <textarea
                    value={validationProof}
                    onChange={(e) => setValidationProof(e.target.value)}
                    placeholder="GitHub commit link, screenshot, or explanation..."
                    className="w-full bg-gray-800 border border-gray-700 px-4 py-3 text-white placeholder:text-gray-500 focus:border-gray-500 focus:outline-none cursor-text resize-none rounded-lg"
                    rows={3}
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleComplete}
                      disabled={!validationProof.trim()}
                      className="flex-1 py-3 bg-white text-black font-semibold hover:brightness-90 transition-all cursor-pointer rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Check size={18} /> Submit
                    </button>
                    <button
                      onClick={() => { setShowValidation(false); setValidationProof(''); handleSkip('') }}
                      className="flex-1 py-3 bg-gray-800 border border-gray-700 text-white font-semibold hover:border-gray-500 transition-colors cursor-pointer rounded-2xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showSkipPopup && !showIntellectualTest && (
                <div className="mt-6 pt-6 border-t border-gray-800">
                  <p className="text-sm text-gray-400 mb-3">Why are you skipping this task?</p>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleSkipOptionSelect('already_know')}
                      className={`w-full p-4 border text-left transition-all flex items-center gap-3 ${
                        skipReason === 'already_know' ? 'border-white bg-white/10' : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                      }`}
                    >
                      <SkipForward size={18} className={skipReason === 'already_know' ? 'text-white' : 'text-gray-400'} />
                      I already know this
                    </button>
                    <button
                      onClick={() => handleSkipOptionSelect('not_interested')}
                      className={`w-full p-4 border text-left transition-all flex items-center gap-3 ${
                        skipReason === 'not_interested' ? 'border-white bg-white/10' : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                      }`}
                    >
                      <XCircle size={18} className={skipReason === 'not_interested' ? 'text-white' : 'text-gray-400'} />
                      Not interested
                    </button>
                    <button
                      onClick={() => handleSkipOptionSelect('other')}
                      className={`w-full p-4 border text-left transition-all flex items-center gap-3 ${
                        skipReason === 'other' ? 'border-white bg-white/10' : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                      }`}
                    >
                      <ArrowRight size={18} className={skipReason === 'other' ? 'text-white' : 'text-gray-400'} />
                      Type your reason
                    </button>
                  </div>
                  
                  {skipReason === 'other' && (
                    <div className="mt-4">
                      <textarea
                        value={skipCustomReason}
                        onChange={(e) => setSkipCustomReason(e.target.value)}
                        placeholder="Tell us why you're skipping..."
                        className="w-full bg-gray-800 border border-gray-700 px-4 py-3 text-white placeholder:text-gray-500 focus:border-gray-500 focus:outline-none resize-none rounded-lg"
                        rows={2}
                      />
                      <button
                        onClick={handleSkipCustomSubmit}
                        disabled={!skipCustomReason.trim()}
                        className="mt-3 w-full py-3 bg-white text-black font-semibold hover:brightness-90 transition-all disabled:opacity-50 cursor-pointer rounded-2xl"
                      >
                        Submit
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={() => { setShowSkipPopup(false); setSkipReason(null); setSkipCustomReason('') }}
                    className="mt-4 w-full py-3 bg-gray-800 border border-gray-700 text-white font-semibold hover:border-gray-500 transition-colors cursor-pointer rounded-2xl"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {showIntellectualTest && (
                <div className="mt-6 pt-6 border-t border-gray-800">
                  <p className="text-sm text-gray-400 mb-4">Quick knowledge check before skipping:</p>
                  <div className="space-y-4">
                    {testQuestions.map((q, qIndex) => (
                      <div key={q.id}>
                        <p className="text-sm text-white mb-2">{q.question}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {q.options.map((option: string, oIndex: number) => (
                            <button
                              key={oIndex}
                              onClick={() => setTestAnswers({ ...testAnswers, [qIndex]: oIndex })}
                              className={`p-3 text-sm border transition-all flex items-center gap-2 ${
                                testAnswers[qIndex] === oIndex ? 'border-white bg-white/10 text-white' : 'border-gray-700 bg-gray-800 hover:border-gray-500 text-gray-300'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleIntellectualTestSubmit}
                    className="mt-4 w-full py-3 bg-white text-black font-semibold hover:brightness-90 transition-all cursor-pointer rounded-2xl"
                  >
                    Skip Anyway
                  </button>
                  <button
                    onClick={() => { setShowIntellectualTest(false); setShowSkipPopup(false); setSkipReason(null) }}
                    className="mt-2 w-full py-3 bg-gray-800 border border-gray-700 text-white font-semibold hover:border-gray-500 transition-colors cursor-pointer rounded-2xl"
                  >
                    Go Back
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 border border-gray-800 bg-gray-900 text-center rounded-lg">
              <p className="text-gray-400">No task scheduled for today.</p>
            </div>
          )}
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Your Progress</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 border border-gray-800 bg-gray-900 text-center rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Tasks Completed</p>
              <p className="text-3xl font-bold text-white">{stats.completed}</p>
            </div>
            <div className="p-6 border border-gray-800 bg-gray-900 text-center rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Completion Rate</p>
              <p className="text-3xl font-bold text-white">{stats.rate}%</p>
            </div>
            <div className="p-6 border border-gray-800 bg-gray-900 text-center rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Current Streak</p>
              <p className="text-3xl font-bold text-white">{stats.streak} days</p>
            </div>
            <div className="p-6 border border-gray-800 bg-gray-900 text-center rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Total Actions</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6">Leaderboard</h2>
          
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-800/50 border-b border-gray-800 text-sm font-semibold text-gray-400">
              <div className="col-span-1">Rank</div>
              <div className="col-span-5">User</div>
              <div className="col-span-3 text-right">Score</div>
              <div className="col-span-3 text-right">Streak</div>
            </div>
            
            {leaderboard.slice(0, 10).map((entry) => (
              <div
                key={entry.rank}
                className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-800 last:border-b-0 transition-colors ${
                  entry.isCurrentUser ? 'bg-white/5' : 'hover:bg-gray-800/30'
                }`}
              >
                <div className="col-span-1 flex items-center">
                  {entry.rank <= 3 ? (
                    <Trophy size={18} className="text-white" />
                  ) : (
                    <span className="text-gray-400 font-semibold">#{entry.rank}</span>
                  )}
                </div>
                <div className="col-span-5 flex items-center">
                  <span className={`${entry.isCurrentUser ? 'text-white font-semibold' : 'text-gray-300'}`}>
                    {entry.name}
                    {entry.isCurrentUser && ' (You)'}
                  </span>
                </div>
                <div className="col-span-3 flex items-center justify-end text-gray-300 font-semibold">
                  {entry.score.toLocaleString()}
                </div>
                <div className="col-span-3 flex items-center justify-end text-gray-400">
                  {entry.streak} days
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm py-8">
          <p>Is your behavior aligned with the person you want to become?</p>
        </div>
      </div>
    </div>
  )
}