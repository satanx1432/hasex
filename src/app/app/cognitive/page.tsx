'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CognitiveLoadSystem } from '@/lib/cognitive/cognitive-load-system'

export default function CognitiveLoadPage() {
  const router = useRouter()
  const [step, setStep] = useState<'intro' | 'assessment' | 'locked' | 'recovery'>('intro')
  const [questions, setQuestions] = useState<any[]>([])
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [assessmentResult, setAssessmentResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cognitiveSystem = new CognitiveLoadSystem()

  const startAssessment = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await cognitiveSystem.initiateCognitiveLoadAssessment('user_123', 'manual_trigger')
      setQuestions(result.questions)
      setStep('assessment')
    } catch (err) {
      setError('Failed to load assessment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResponse = (questionId: string, answer: string) => {
    setResponses(prev => ({ ...prev, [questionId]: answer }))
  }

  const submitAssessment = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const responseArray = Object.entries(responses).map(([question_id, answer]) => ({
        question_id,
        answer,
      }))

      const result = await cognitiveSystem.processAssessmentResponses(
        'user_123',
        `assessment_${Date.now()}`,
        responseArray
      )

      setAssessmentResult(result)

      if (result.status === 'overloaded') {
        await cognitiveSystem.applyCognitiveLock('user_123', result)
        setStep('locked')
      } else {
        router.push('/app/home')
      }
    } catch (err) {
      setError('Failed to process assessment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const startRecoveryAssessment = async () => {
    setIsLoading(true)
    try {
      const result = await cognitiveSystem.initiateRecoveryAssessment('user_123')
      setQuestions(result.questions)
      setStep('recovery')
    } catch (err) {
      setError('Failed to load recovery assessment.')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'intro') {
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
            <span className="font-label-mono text-label-mono tracking-widest text-primary">Cognitive Check</span>
            <div className="w-6" />
          </nav>
        </header>

        <main className="pt-24 pb-32 px-grid-margin min-h-screen">
          <div className="max-w-[640px] mx-auto">
            <div className="bg-surface border border-border p-6 mb-stack-lg">
              <h1 className="font-headline-lg text-headline-lg text-primary mb-4">
                Cognitive Load Assessment
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                This quick assessment helps us understand your current mental state and optimize your
                task recommendations accordingly.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl" data-icon="psychology">
                    psychology
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface">
                    5 quick questions about your current mental state
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl" data-icon="schedule">
                    schedule
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface">
                    Takes less than 2 minutes to complete
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl" data-icon="tune">
                    tune
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface">
                    Helps us personalize your task recommendations
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-error-container border border-error p-4 mb-stack-lg">
                <p className="font-body-sm text-body-sm text-on-error-container">{error}</p>
              </div>
            )}

            <button
              onClick={startAssessment}
              disabled={isLoading}
              className="w-full bg-primary text-background font-headline-md text-headline-md font-bold uppercase tracking-widest h-[64px] hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer rounded-2xl"
            >
              {isLoading ? 'Loading...' : 'Start Assessment'}
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (step === 'assessment' || step === 'recovery') {
    return (
      <div className="bg-background min-h-screen">
        <header className="fixed top-0 left-0 w-full z-50 bg-background border-b border-border">
          <nav className="flex justify-between items-center w-full px-grid-margin py-stack-sm max-w-[640px] mx-auto">
            <button
              onClick={() => setStep('intro')}
              className="material-symbols-outlined text-primary"
              data-icon="arrow_back"
            >
              arrow_back
            </button>
            <span className="font-label-mono text-label-mono tracking-widest text-primary">
              {step === 'assessment' ? 'Assessment' : 'Recovery Check'}
            </span>
            <div className="w-6" />
          </nav>
        </header>

        <main className="pt-24 pb-32 px-grid-margin min-h-screen">
          <div className="max-w-[640px] mx-auto">
            <div className="mb-stack-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-label-mono text-label-mono text-on-surface-variant">
                  Question {Object.keys(responses).length + 1} of {questions.length}
                </span>
                <span className="font-label-mono text-label-mono text-primary">
                  {Math.round((Object.keys(responses).length / questions.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{
                    width: `${(Object.keys(responses).length / questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {questions.map((question, index) => {
              const currentQuestionIndex = Object.keys(responses).length
              if (index !== currentQuestionIndex) return null

              return (
                <div key={question.id} className="bg-surface border border-border p-6 mb-stack-lg">
                  <h2 className="font-headline-md text-headline-md text-primary mb-6">
                    {question.question_text}
                  </h2>

                  <div className="space-y-3">
                    {question.options?.map((option: string, optIndex: number) => (
                      <button
                        key={optIndex}
                        onClick={() => handleResponse(question.id, option)}
                        className="w-full text-left p-4 border border-border rounded-xl hover:border-primary transition-all font-body-md text-body-md text-on-surface"
                      >
                        {option}
                      </button>
                    ))}
                  </div>

                  {responses[question.id] && (
                    <button
                      onClick={() =>
                        index < questions.length - 1
                          ? null
                          : step === 'assessment'
                          ? submitAssessment()
                          : startRecoveryAssessment()
                      }
                      disabled={isLoading}
                      className="w-full mt-6 bg-primary text-background font-headline-md text-headline-md font-bold uppercase tracking-widest h-[64px] hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer rounded-2xl"
                    >
                      {isLoading
                        ? 'Processing...'
                        : index < questions.length - 1
                        ? 'Next'
                        : step === 'assessment'
                        ? 'Submit Assessment'
                        : 'Submit Recovery'}
                    </button>
                  )}
                </div>
              )
            })}

            {error && (
              <div className="bg-error-container border border-error p-4 mb-stack-lg">
                <p className="font-body-sm text-body-sm text-on-error-container">{error}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  if (step === 'locked' && assessmentResult) {
    return (
      <div className="bg-background min-h-screen">
        <header className="fixed top-0 left-0 w-full z-50 bg-background border-b border-border">
          <nav className="flex justify-between items-center w-full px-grid-margin py-stack-sm max-w-[640px] mx-auto">
            <div className="w-6" />
            <span className="font-label-mono text-label-mono tracking-widest text-primary">
              Cognitive Break
            </span>
            <div className="w-6" />
          </nav>
        </header>

        <main className="pt-24 pb-32 px-grid-margin min-h-screen">
          <div className="max-w-[640px] mx-auto">
            <div className="bg-surface border border-border p-6 mb-stack-lg text-center">
              <span className="material-symbols-outlined text-6xl text-primary mb-4" data-icon="self_improvement">
                self_improvement
              </span>
              <h1 className="font-headline-lg text-headline-lg text-primary mb-4">
                Time for a Break
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mb-2">
                {assessmentResult.lock_reason}
              </p>
              <p className="font-label-mono text-label-mono text-primary mb-6">
                Break duration: {assessmentResult.suggested_break_duration} minutes
              </p>
            </div>

            <div className="bg-surface border border-border p-6 mb-stack-lg">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                Suggested Activities
              </h2>
              <div className="space-y-3">
                {assessmentResult.break_activities?.map((activity: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary" data-icon="check_circle">
                      check_circle
                    </span>
                    <p className="font-body-md text-body-md text-on-surface">{activity}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-border p-6 mb-stack-lg">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                What You Can Do
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary" data-icon="chat">
                    chat
                  </span>
                  <p className="font-body-md text-body-md text-on-surface">
                    Continue chatting with AI coach
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary" data-icon="spa">
                    spa
                  </span>
                  <p className="font-body-md text-body-md text-on-surface">
                    Focus on recovery activities
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary" data-icon="block">
                    block
                  </span>
                  <p className="font-body-md text-body-md text-on-surface">
                    New tasks are temporarily paused
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={startRecoveryAssessment}
              className="w-full bg-surface-variant text-on-surface-variant font-headline-md text-headline-md font-bold uppercase tracking-widest h-[64px] hover:brightness-110 transition-all cursor-pointer rounded-2xl border border-border"
            >
              Check Recovery Status
            </button>
          </div>
        </main>
      </div>
    )
  }

  return null
}
