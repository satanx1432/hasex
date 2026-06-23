'use client'

import { useState, useEffect } from 'react'
import { CognitiveLoadSystem, CognitiveLock } from '@/lib/cognitive/cognitive-load-system'

interface CognitiveLockOverlayProps {
  userId: string
  onUnlock?: () => void
  allowedRoutes?: string[]
}

export default function CognitiveLockOverlay({ userId, onUnlock, allowedRoutes = [] }: CognitiveLockOverlayProps) {
  const [lockStatus, setLockStatus] = useState<{
    is_locked: boolean
    lock?: CognitiveLock
    time_remaining?: number
  }>({ is_locked: false })
  const [showRecovery, setShowRecovery] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const cognitiveSystem = new CognitiveLoadSystem()

  useEffect(() => {
    checkLockStatus()
    const interval = setInterval(checkLockStatus, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [userId])

  const checkLockStatus = async () => {
    try {
      const status = await cognitiveSystem.checkCognitiveLockStatus(userId)
      setLockStatus(status)
    } catch (error) {
      console.error('Failed to check lock status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const handleStartRecovery = () => {
    setShowRecovery(true)
  }

  if (isLoading) {
    return null
  }

  if (!lockStatus.is_locked) {
    return null
  }

  if (showRecovery) {
    return <RecoveryAssessment userId={userId} onComplete={() => {
      setShowRecovery(false)
      checkLockStatus()
      onUnlock?.()
    }} onCancel={() => setShowRecovery(false)} />
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 text-center">
        <div className="w-20 h-20 bg-error-container rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-4xl text-on-error-container" data-icon="psychology">
            psychology
          </span>
        </div>

        <h1 className="font-headline-lg text-headline-lg text-primary mb-2">
          Cognitive Break Required
        </h1>

        <p className="font-body-md text-body-md text-on-surface-variant mb-6">
          {lockStatus.lock?.lock_reason || 'Your cognitive load assessment indicates you need a break.'}
        </p>

        <div className="bg-surface-variant border border-border rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary" data-icon="schedule">
              schedule
            </span>
            <span className="font-label-mono text-label-mono text-primary">
              {lockStatus.time_remaining ? formatTimeRemaining(lockStatus.time_remaining) : 'Loading...'}
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Time remaining until unlock
          </p>
        </div>

        <div className="mb-6">
          <p className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-3">
            Suggested Break Activities
          </p>
          <div className="space-y-2">
            {lockStatus.lock?.break_suggestions?.slice(0, 3).map((activity, index) => (
              <div key={index} className="flex items-start gap-2 text-left">
                <span className="material-symbols-outlined text-primary text-lg" data-icon="check_circle">
                  check_circle
                </span>
                <p className="font-body-sm text-body-sm text-on-surface">{activity}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleStartRecovery}
            className="w-full bg-primary text-background font-headline-md text-headline-md font-bold uppercase tracking-widest h-[56px] hover:brightness-110 transition-all cursor-pointer rounded-xl"
          >
            I'm Ready to Continue
          </button>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            You'll complete a quick assessment to ensure you're ready
          </p>
        </div>

        {lockStatus.lock?.chat_access_only && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">
              Chat access is available during your break
            </p>
            <button
              onClick={() => window.location.href = '/app/chat'}
              className="text-primary underline font-label-mono text-label-mono"
            >
              Go to Chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function RecoveryAssessment({ userId, onComplete, onCancel }: { userId: string; onComplete: () => void; onCancel: () => void }) {
  const [questions, setQuestions] = useState<any[]>([])
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cognitiveSystem = new CognitiveLoadSystem()

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    setIsLoading(true)
    try {
      const result = await cognitiveSystem.initiateRecoveryAssessment(userId)
      setQuestions(result.questions)
    } catch (error) {
      console.error('Failed to load recovery questions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResponse = (questionId: string, answer: string) => {
    setResponses(prev => ({ ...prev, [questionId]: answer }))
  }

  const submitAssessment = async () => {
    setIsSubmitting(true)
    try {
      const responseArray = Object.entries(responses).map(([question_id, answer]) => ({
        question_id,
        answer,
      }))

      const result = await cognitiveSystem.processRecoveryAssessment(
        userId,
        `recovery_${Date.now()}`,
        responseArray,
        0 // previousScore - could be fetched from lock status if needed
      )

      if (result.ready_to_engage) {
        onComplete()
      } else {
        alert('Not ready yet. Please take more time to recover.')
      }
    } catch (error) {
      console.error('Failed to process recovery assessment:', error)
      alert('Failed to process assessment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentQuestionIndex = Object.keys(responses).length
  const currentQuestion = questions[currentQuestionIndex]

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 text-center">
          <p className="font-body-md text-body-md text-on-surface-variant mb-4">
            No questions available
          </p>
          <button
            onClick={onCancel}
            className="text-primary underline font-label-mono text-label-mono"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onCancel}
            className="material-symbols-outlined text-primary"
            data-icon="close"
          >
            close
          </button>
          <span className="font-label-mono text-label-mono text-primary">
            Recovery Check
          </span>
          <div className="w-6" />
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-label-mono text-label-mono text-on-surface-variant">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="font-label-mono text-label-mono text-primary">
              {Math.round((currentQuestionIndex / questions.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{
                width: `${(currentQuestionIndex / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-headline-md text-headline-md text-primary mb-6">
            {currentQuestion.question_text}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options?.map((option: string, optIndex: number) => (
              <button
                key={optIndex}
                onClick={() => handleResponse(currentQuestion.id, option)}
                className="w-full text-left p-4 border border-border rounded-xl hover:border-primary transition-all font-body-md text-body-md text-on-surface"
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={submitAssessment}
          disabled={isSubmitting || !responses[currentQuestion.id]}
          className="w-full bg-primary text-background font-headline-md text-headline-md font-bold uppercase tracking-widest h-[56px] hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer rounded-xl"
        >
          {isSubmitting ? 'Processing...' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
