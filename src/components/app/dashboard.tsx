'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export default function Dashboard() {
  const router = useRouter()
  const [currentGoal, setCurrentGoal] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const goal = sessionStorage.getItem('userGoal') || ''
    setCurrentGoal(goal)
    setIsLoading(false)
  }, [])

  const handleNewAction = () => {
    router.push('/app/actions')
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
          <span className="font-label-mono text-label-mono tracking-widest text-primary">BOS</span>
          <span className="material-symbols-outlined text-primary cursor-pointer" data-icon="account_circle">
            account_circle
          </span>
        </nav>
      </header>

      <main className="pt-24 pb-32 px-grid-margin min-h-screen">
        <div className="max-w-[640px] mx-auto">
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-2">
                Current Goal
              </h2>
              <p className="font-headline-lg text-headline-lg text-primary">
                {currentGoal || 'No goal set'}
              </p>
            </div>
          </section>

          <section className="mb-stack-lg">
            {currentGoal ? (
              <div className="bg-surface border border-border p-6 text-center">
                <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                  Complete actions to track your progress.
                </p>
              </div>
            ) : (
              <div className="bg-surface border border-border p-6 text-center">
                <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                  Set a goal to get started.
                </p>
                <button
                  onClick={() => router.push('/onboarding')}
                  className="text-primary underline font-label-mono text-label-mono"
                >
                  Start onboarding
                </button>
              </div>
            )}
          </section>

          <section className="mb-stack-lg grid grid-cols-3 gap-4">
            <div className="bg-surface border border-border p-4 text-center">
              <div className="font-label-mono text-headline-lg text-primary mb-1">
                {currentGoal ? '0' : '—'}
              </div>
              <div className="font-label-mono text-label-mono text-on-surface-variant">Completed</div>
            </div>
            <div className="bg-surface border border-border p-4 text-center">
              <div className="font-label-mono text-headline-lg text-primary mb-1">
                {currentGoal ? '0%' : '—'}
              </div>
              <div className="font-label-mono text-label-mono text-on-surface-variant">Rate</div>
            </div>
            <div className="bg-surface border border-border p-4 text-center">
              <div className="font-label-mono text-headline-lg text-primary mb-1">
                {currentGoal ? '0' : '—'}
              </div>
              <div className="font-label-mono text-label-mono text-on-surface-variant">Streak</div>
            </div>
          </section>

          <button
            className="w-full bg-primary text-background font-headline-md text-headline-md font-bold uppercase tracking-widest h-[64px] hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer rounded-2xl"
            onClick={handleNewAction}
            disabled={!currentGoal}
          >
            New Action
          </button>
        </div>
      </main>
    </div>
  )
}