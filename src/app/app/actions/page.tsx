'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { DatabaseService } from '@/lib/supabase/database'
import { getActiveGoal } from '@/lib/data/goals'

interface MicroAction {
  id: string
  title: string
  description: string
  if_then_plan: string
  difficulty_score: number
  estimated_time_minutes: number
  status: 'pending' | 'selected' | 'completed' | 'skipped'
}

export default function ActionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [actions, setActions] = useState<MicroAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentGoal, setCurrentGoal] = useState<any>(null)
  const [showNewAction, setShowNewAction] = useState(false)
  const [newAction, setNewAction] = useState({
    title: '',
    description: '',
    if_then_plan: '',
    difficulty_score: 5,
    estimated_time_minutes: 15
  })
  const db = new DatabaseService()

  useEffect(() => {
    loadActions()
  }, [user])

  const loadActions = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    try {
      setIsLoading(true)
      
      // Get current goal
      const goal = await getActiveGoal(user.id)
      setCurrentGoal(goal)

      if (goal) {
        const microActions = await db.getMicroActions(goal.id)
        setActions(microActions)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load actions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentGoal || !user) return

    try {
      await db.createMicroAction({
        goal_id: currentGoal.id,
        user_id: user.id,
        title: newAction.title,
        description: newAction.description,
        if_then_plan: newAction.if_then_plan,
        difficulty_score: newAction.difficulty_score,
        estimated_time_minutes: newAction.estimated_time_minutes,
        status: 'pending'
      })

      setNewAction({
        title: '',
        description: '',
        if_then_plan: '',
        difficulty_score: 5,
        estimated_time_minutes: 15
      })
      setShowNewAction(false)
      loadActions()
    } catch (err: any) {
      setError(err.message || 'Failed to create action')
    }
  }

  const handleSelectAction = async (actionId: string) => {
    try {
      await db.updateMicroAction(actionId, { status: 'selected' })
      loadActions()
    } catch (err: any) {
      setError(err.message || 'Failed to select action')
    }
  }

  const handleCompleteAction = async (actionId: string) => {
    try {
      await db.updateMicroAction(actionId, { status: 'completed' })
      loadActions()
    } catch (err: any) {
      setError(err.message || 'Failed to complete action')
    }
  }

  const getDifficultyColor = (score: number) => {
    if (score <= 3) return 'text-green-400'
    if (score <= 6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getDifficultyLabel = (score: number) => {
    if (score <= 3) return 'Easy'
    if (score <= 6) return 'Medium'
    return 'Hard'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-20">
      <div className="max-w-[640px] mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Actions</h1>
          <p className="text-on-surface-variant">
            {currentGoal ? `Actions for: ${currentGoal.title}` : 'No active goal. Create one to get started.'}
          </p>
        </header>

        {error && (
          <div className="bg-error-container border border-error p-4 rounded-lg mb-6">
            <p className="text-on-error text-sm">{error}</p>
          </div>
        )}

        {!currentGoal && (
          <div className="bg-surface border border-border rounded-xl p-6 text-center">
            <p className="text-on-surface-variant mb-4">You need an active goal to create actions</p>
            <button
              onClick={() => router.push('/onboarding')}
              className="bg-primary text-background px-6 py-3 rounded-xl font-bold"
            >
              Create a Goal
            </button>
          </div>
        )}

        {currentGoal && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-primary">Your Actions</h2>
              <button
                onClick={() => setShowNewAction(!showNewAction)}
                className="bg-primary text-background px-4 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                <span className="material-symbols-outlined" data-icon="add">add</span>
                New Action
              </button>
            </div>

            {showNewAction && (
              <div className="bg-surface border border-border rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Create New Action</h3>
                <form onSubmit={handleCreateAction} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Title</label>
                    <input
                      type="text"
                      value={newAction.title}
                      onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
                      className="w-full bg-surface-container border border-border focus:border-primary px-4 py-2 rounded-lg focus:outline-none text-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">Description</label>
                    <textarea
                      value={newAction.description}
                      onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
                      className="w-full bg-surface-container border border-border focus:border-primary px-4 py-2 rounded-lg focus:outline-none text-primary h-20 resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">If-Then Plan</label>
                    <input
                      type="text"
                      value={newAction.if_then_plan}
                      onChange={(e) => setNewAction({ ...newAction, if_then_plan: e.target.value })}
                      placeholder="If [situation], then I will [action]"
                      className="w-full bg-surface-container border border-border focus:border-primary px-4 py-2 rounded-lg focus:outline-none text-primary"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">Difficulty (1-10)</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newAction.difficulty_score}
                        onChange={(e) => setNewAction({ ...newAction, difficulty_score: parseInt(e.target.value) })}
                        className="w-full bg-surface-container border border-border focus:border-primary px-4 py-2 rounded-lg focus:outline-none text-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">Est. Minutes</label>
                      <input
                        type="number"
                        min="1"
                        value={newAction.estimated_time_minutes}
                        onChange={(e) => setNewAction({ ...newAction, estimated_time_minutes: parseInt(e.target.value) })}
                        className="w-full bg-surface-container border border-border focus:border-primary px-4 py-2 rounded-lg focus:outline-none text-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-background py-2 rounded-lg font-bold"
                    >
                      Create Action
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewAction(false)}
                      className="flex-1 bg-surface-variant text-primary py-2 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {actions.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4" data-icon="playlist_add">
                  playlist_add
                </span>
                <p className="text-on-surface-variant mb-4">No actions yet. Create your first action to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className={`bg-surface border rounded-xl p-6 transition-all ${
                      action.status === 'completed' ? 'border-green-500 opacity-60' : 'border-border'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className={`text-lg font-semibold ${action.status === 'completed' ? 'line-through text-on-surface-variant' : 'text-primary'}`}>
                        {action.title}
                      </h3>
                      <span className={`text-sm font-medium ${getDifficultyColor(action.difficulty_score)}`}>
                        {getDifficultyLabel(action.difficulty_score)}
                      </span>
                    </div>

                    <p className="text-on-surface-variant text-sm mb-3">{action.description}</p>

                    {action.if_then_plan && (
                      <div className="bg-surface-container-low border border-border p-3 rounded-lg mb-4">
                        <p className="text-xs text-on-surface-variant mb-1">If-Then Plan:</p>
                        <p className="text-primary text-sm">{action.if_then_plan}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-on-surface-variant">
                        {action.estimated_time_minutes} min
                      </span>

                      <div className="flex gap-2">
                        {action.status === 'pending' && (
                          <button
                            onClick={() => handleSelectAction(action.id)}
                            className="bg-primary text-background px-4 py-2 rounded-lg text-sm font-medium"
                          >
                            Select
                          </button>
                        )}
                        {action.status === 'selected' && (
                          <button
                            onClick={() => handleCompleteAction(action.id)}
                            className="bg-green-600 text-background px-4 py-2 rounded-lg text-sm font-medium"
                          >
                            Complete
                          </button>
                        )}
                        {action.status === 'completed' && (
                          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined" data-icon="check_circle">check_circle</span>
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
