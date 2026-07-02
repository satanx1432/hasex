'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { createGoal, createDestination, createRoadmap, createFirstTask } from '@/lib/data/goals'
import { ArrowLeft, ArrowRight, Check, Loader2, User } from 'lucide-react'
import { aiService } from '@/lib/ai/ai-service'

const DEEP_QUESTIONS = [
  { id: 1, question: "What specifically do you want to achieve, and why does it matter to you?", placeholder: "I want to... because..." },
  { id: 2, question: "What obstacles or failures have you faced when trying to achieve similar goals?", placeholder: "I've struggled with..." },
  { id: 3, question: "What are you willing to sacrifice daily to achieve this goal?", placeholder: "I'm willing to give up..." },
  { id: 4, question: "What does success look like to you? Be specific.", placeholder: "When I succeed, I will..." },
  { id: 5, question: "What time of day do you feel most energetic and focused?", placeholder: "I feel most productive..." },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user, isGuest } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState('')
  const [deepAnswers, setDeepAnswers] = useState<Record<number, string>>({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null)

  useEffect(() => {
    if (!user && !isGuest) {
      router.push('/auth/login')
    }
  }, [user, isGuest, router])

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal.trim()) return
    setStep(2)
  }

  const handleDeepAnswerSubmit = async () => {
    if (currentQuestion < DEEP_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      await createPlan()
    }
  }

  const handleSkipQuestion = () => {
    if (currentQuestion < DEEP_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      createPlan()
    }
  }

  const createPlan = async () => {
    setIsGenerating(true)
    setError('')

    const userId = isGuest ? 'guest' : user?.id
    if (!userId) {
      setError('Unable to create goal. Please try again.')
      setIsGenerating(false)
      return
    }

    try {
      const goalData = await createGoal(userId, goal, {
        type: 'personal',
        complexity: 'medium',
        confidence: 0.8
      })
      setCreatedGoalId(goalData.id)

      generateInBackground(userId, goalData.id, goal, deepAnswers)
        .then(() => console.log('Background AI generation completed'))
        .catch((err) => console.error('Background AI generation failed:', err))

      setStep(3)
    } catch (err: any) {
      setError(err.message || 'Failed to create goal. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateInBackground = async (userId: string, goalId: string, goalText: string, answers: Record<number, string>) => {
    let destinationData
    try {
      const contextSummary = Object.entries(answers)
        .map(([_, value]) => value)
        .filter(Boolean)
        .join('; ')

      const insight = await aiService.generateInsight(
        `Goal: ${goalText}. User context: ${contextSummary}`,
        { goal: goalText, answers }
      )

      destinationData = await createDestination(userId, goalId, {
        destination_text: `Someone who has achieved: ${goalText}`,
        duration: '3 months',
        complexity: 'medium',
        reason: insight || 'Achievable through consistent daily actions'
      })
    } catch (aiError) {
      console.error('Destination AI generation failed:', aiError)
      destinationData = await createDestination(userId, goalId, {
        destination_text: `Someone who has achieved: ${goalText}`,
        duration: '3 months',
        complexity: 'medium',
        reason: 'Achievable through consistent daily actions'
      })
    }

    const stages = [
      { title: 'Foundation', description: 'Build the basic habits and systems', sort_order: 1, category: 'setup' },
      { title: 'Momentum', description: 'Increase intensity and add complexity', sort_order: 2, category: 'growth' },
      { title: 'Mastery', description: 'Refine and optimize your approach', sort_order: 3, category: 'mastery' }
    ]

    const { roadmap, stages: createdStages } = await createRoadmap(userId, goalId, destinationData.id, stages)

    try {
      const result = await aiService.generateActionOptions(goalText, { answers }, { deepAnswers: true })
      
      const stageId = createdStages[0]?.id || 'stage_1'
      if (result.actions && result.actions.length > 0) {
        const firstAction = result.actions[0]
        await createFirstTask(userId, goalId, stageId, {
          title: firstAction.title || 'First step toward your goal',
          description: firstAction.description || 'Start with something simple',
          if_then_plan: firstAction.if_then_plan || 'If I have 5 minutes, then I will take one small action',
          difficulty_score: firstAction.difficulty_score || 2,
          estimated_minutes: firstAction.estimated_time_minutes || 5
        })
      } else {
        throw new Error('No actions generated')
      }
    } catch (taskError) {
      console.error('First task generation failed:', taskError)
      const stageId = createdStages[0]?.id || 'stage_1'
      await createFirstTask(userId, goalId, stageId, {
        title: 'First step toward your goal',
        description: 'Start with something simple',
        if_then_plan: 'If I have 5 minutes, then I will take one small action',
        difficulty_score: 2,
        estimated_minutes: 5
      })
    }
  }

  const handleComplete = () => {
    startTransition(() => router.push('/app/home'))
  }

  const handleBack = () => {
    if (step === 1) {
      startTransition(() => router.back())
    } else if (step === 2) {
      setStep(1)
    } else if (step === 3) {
      setStep(1)
      setGoal('')
      setDeepAnswers({})
      setCurrentQuestion(0)
      setCreatedGoalId(null)
    }
  }

  if (!user && !isGuest) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="flex items-center justify-center mb-8">
          <div className="h-1 flex-1 rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
        </div>

        <button onClick={handleBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </button>

        {step === 1 && (
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">What's your goal?</h1>
            <p className="text-gray-400 mb-8">Setting a clear goal is the first step toward behavioral change</p>

            {isGuest && (
              <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-lg text-left">
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} className="text-white" />
                  <p className="text-sm text-white font-semibold">Guest Mode</p>
                </div>
                <p className="text-xs text-gray-400">Your data is stored locally. AI is generating your roadmap in the background.</p>
              </div>
            )}

            <form onSubmit={handleGoalSubmit} className="space-y-6">
              <div>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., Exercise regularly, Learn a new skill, Build better habits..."
                  className="w-full h-32 bg-gray-900 border border-gray-800 focus:border-white px-4 py-3 rounded-xl focus:outline-none text-white placeholder:text-gray-500 resize-none"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button type="submit" disabled={!goal.trim()} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Continue
              </button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <div className="mb-4">
              <span className="text-sm text-gray-400">Question {currentQuestion + 1} of {DEEP_QUESTIONS.length}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">{DEEP_QUESTIONS[currentQuestion].question}</h1>
            <p className="text-gray-400 mb-6">Take a moment to reflect. Your answer helps us personalize your experience.</p>

            <textarea
              value={deepAnswers[DEEP_QUESTIONS[currentQuestion].id] || ''}
              onChange={(e) => setDeepAnswers({ ...deepAnswers, [DEEP_QUESTIONS[currentQuestion].id]: e.target.value })}
              placeholder={DEEP_QUESTIONS[currentQuestion].placeholder}
              className="w-full h-32 bg-gray-900 border border-gray-800 focus:border-white px-4 py-3 rounded-xl focus:outline-none text-white placeholder:text-gray-500 resize-none mb-6"
            />

            <div className="space-y-3">
              <button
                onClick={handleDeepAnswerSubmit}
                className="w-full bg-white text-black font-bold py-4 rounded-xl hover:brightness-90 transition-all flex items-center justify-center gap-2"
              >
                {currentQuestion < DEEP_QUESTIONS.length - 1 ? (
                  <>Continue <ArrowRight size={18} /></>
                ) : (
                  <>Create My Plan <Check size={18} /></>
                )}
              </button>
              <button onClick={handleSkipQuestion} className="w-full py-3 text-gray-400 hover:text-white transition-colors">
                Skip this question
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
              {isGenerating ? (
                <Loader2 size={32} className="text-black animate-spin" />
              ) : (
                <Check size={32} className="text-black" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              {isGenerating ? 'Creating your plan...' : "You're all set!"}
            </h1>
            <p className="text-gray-400 mb-8">
              {isGenerating ? 'AI is generating your personalized roadmap. This may take a moment.' : 'Your personalized plan is ready. AI is still optimizing details in the background.'}
            </p>

            <button onClick={handleComplete} disabled={isGenerating} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:brightness-90 transition-all disabled:opacity-50">
              {isGenerating ? 'Please wait...' : 'Start Your Journey'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}