/**
 * PROFILE Screen - Screen 3 of Main Product
 * 
 * Purpose: Show user profile that evolves over time
 */

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProfileScreenProps {
  userId: string
}

interface Profile {
  currentGoals: string[]
  availableTime: string
  resources: string[]
  strengths: string[]
  weaknesses: string[]
  executionStyle: string
  behavioralPatterns: string[]
  aiObservations: string[]
}

export default function ProfileScreen({ userId }: ProfileScreenProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    if (!supabase) return
    
    try {
      // Load goals
      const { data: goals } = await supabase
        .from('goals')
        .select('title, classification')
        .eq('user_id', userId)
        .eq('status', 'active') as { data: { title: string; classification: any }[] | null }

      // Extract from metadata
      const goalsData = goals || []
      const goalTitles = goalsData.map(g => g.title)
      const timeCommitment = goalsData[0]?.classification?.time_commitment || 'Not set'
      const resourcesList = goalsData[0]?.classification?.resources || 'Not set'

      // Load behavioral patterns
      const behavioralPatterns = await getBehavioralPatterns(userId)

      // Load AI observations (from memory system when available)
      const aiObservations = await getAIObservations(userId)

      setProfile({
        currentGoals: goalTitles,
        availableTime: timeCommitment,
        resources: [resourcesList],
        strengths: await getStrengths(userId),
        weaknesses: await getWeaknesses(userId),
        executionStyle: await getExecutionStyle(userId),
        behavioralPatterns,
        aiObservations
      })
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getBehavioralPatterns = async (userId: string): Promise<string[]> => {
    try {
      const patterns: string[] = []

      // Check consistency
      const { data: weeklyActions } = await supabase
        .from('task_completions')
        .select('completed_at')
        .eq('user_id', userId)
        .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) as { data: { completed_at: string }[] | null }

      if (weeklyActions) {
        const uniqueDays = new Set(weeklyActions.map(a => new Date(a.completed_at).toISOString().split('T')[0])).size
        if (uniqueDays >= 5) patterns.push('High consistency')
        else if (uniqueDays >= 3) patterns.push('Moderate consistency')
        else patterns.push('Low consistency')
      }

      // Check completion patterns
      const { data: allMissions } = await supabase
        .from('task_completions')
        .select('status')
        .eq('user_id', userId)
        .limit(50) as { data: { status: string }[] | null }

      if (allMissions) {
        const completed = allMissions.filter(m => m.status === 'completed').length
        const completionRate = completed / allMissions.length
        if (completionRate > 0.8) patterns.push('High completion rate')
        else if (completionRate > 0.5) patterns.push('Moderate completion rate')
        else patterns.push('Low completion rate')
      }

      return patterns
    } catch (error) {
      return ['Not enough data']
    }
  }

  const getStrengths = async (userId: string): Promise<string[]> => {
    try {
      const strengths: string[] = []

      const executionRate = await calculateExecutionRate(userId)
      if (executionRate > 70) strengths.push('Consistent executor')

      const currentStreak = await getCurrentStreak(userId)
      if (currentStreak >= 7) strengths.push('Strong momentum builder')

      const avgTime = await getAverageCompletionTime(userId)
      if (avgTime < 30) strengths.push('Fast executor')

      return strengths
    } catch (error) {
      return []
    }
  }

  const getWeaknesses = async (userId: string): Promise<string[]> => {
    try {
      const weaknesses: string[] = []

      const executionRate = await calculateExecutionRate(userId)
      if (executionRate < 50) weaknesses.push('Inconsistent executor')

      const currentStreak = await getCurrentStreak(userId)
      if (currentStreak < 3) weaknesses.push('Struggles with momentum')

      return weaknesses
    } catch (error) {
      return []
    }
  }

  const getExecutionStyle = async (userId: string): Promise<string> => {
    try {
      const executionRate = await calculateExecutionRate(userId)
      const patterns = await getBehavioralPatterns(userId)

      if (executionRate > 80 && patterns.includes('High consistency')) {
        return 'Disciplined and consistent'
      } else if (executionRate > 60) {
        return 'Steady progress'
      } else if (executionRate > 40) {
        return 'Needs accountability'
      } else {
        return 'Requires structure and support'
      }
    } catch (error) {
      return 'Not enough data'
    }
  }

  const getAIObservations = async (userId: string): Promise<string[]> => {
    try {
      // In production, this would come from memory system
      return [
        'Based on recent behavior...',
        'Needs more data for AI insights'
      ]
    } catch (error) {
      return []
    }
  }

  const calculateExecutionRate = async (userId: string): Promise<number> => {
    try {
      const { data: allMissions } = await supabase!
        .from('daily_missions')
        .select('id')
        .eq('user_id', userId)

      const { data: completedMissions } = await supabase!
        .from('daily_missions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'completed')

      if (!allMissions || allMissions.length === 0) return 0
      return ((completedMissions?.length || 0) / allMissions.length) * 100
    } catch (error) {
      return 0
    }
  }

  const getCurrentStreak = async (userId: string): Promise<number> => {
    try {
      const { getUserStats } = await import('@/lib/data/goals')
      const stats = await getUserStats(userId)
      return stats.streak
    } catch (error) {
      return 0
    }
  }

  const getAverageCompletionTime = async (userId: string): Promise<number> => {
    try {
      const { data: completions } = await supabase
        .from('task_completions')
        .select('energy_level')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(50) as { data: { energy_level: number | null }[] | null }

      if (!completions || completions.length === 0) return 30
      // Use energy_level as proxy for time (scale 1-5, multiply by 15 min)
      return completions.reduce((sum, c) => sum + ((c.energy_level || 3) * 15), 0) / completions.length
    } catch (error) {
      return 30
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="text-gray-400">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile</h1>
          <div className="text-sm text-gray-400">Evolves over time based on your execution</div>
        </div>

        {/* Current Goals */}
        {profile && (
          <div className="p-6 border border-white/10 rounded-lg">
            <div className="text-sm text-gray-400 mb-3">Current Goals</div>
            <div className="space-y-2">
              {profile.currentGoals.length > 0 ? (
                profile.currentGoals.map((goal, index) => (
                  <div key={index} className="text-lg font-semibold">• {goal}</div>
                ))
              ) : (
                <div className="text-gray-500">No goals set yet</div>
              )}
            </div>
          </div>
        )}

        {/* Available Time */}
        {profile && (
          <div className="p-6 border border-white/10 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">Available Time</div>
            <div className="text-xl font-semibold">{profile.availableTime}</div>
          </div>
        )}

        {/* Resources */}
        {profile && (
          <div className="p-6 border border-white/10 rounded-lg">
            <div className="text-sm text-gray-400 mb-3">Resources</div>
            <div className="space-y-2">
              {profile.resources.map((resource, index) => (
                <div key={index} className="text-sm">• {resource}</div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {profile && (
          <div className="p-6 border border-white/10 rounded-lg">
            <div className="text-sm text-gray-400 mb-3">Strengths</div>
            <div className="space-y-2">
              {profile.strengths.length > 0 ? (
                profile.strengths.map((strength, index) => (
                  <div key={index} className="text-sm text-green-400">✓ {strength}</div>
                ))
              ) : (
                <div className="text-gray-500">Not enough data</div>
              )}
            </div>
          </div>
        )}

        {/* Weaknesses */}
        {profile && (
          <div className="p-6 border border-white/10 rounded-lg">
            <div className="text-sm text-gray-400 mb-3">Weaknesses</div>
            <div className="space-y-2">
              {profile.weaknesses.length > 0 ? (
                profile.weaknesses.map((weakness, index) => (
                  <div key={index} className="text-sm text-red-400">⚠️ {weakness}</div>
                ))
              ) : (
                <div className="text-gray-500">Not enough data</div>
              )}
            </div>
          </div>
        )}

        {/* Execution Style */}
        {profile && (
          <div className="p-6 border border-white/10 rounded-lg">
            <div className="text-sm text-gray-400 mb-2">Execution Style</div>
            <div className="text-xl font-semibold text-white-400">{profile.executionStyle}</div>
          </div>
        )}

        {/* Behavioral Patterns */}
        {profile && (
          <div className="p-6 border border-white/10 rounded-lg">
            <div className="text-sm text-gray-400 mb-3">Behavioral Patterns</div>
            <div className="space-y-2">
              {profile.behavioralPatterns.map((pattern, index) => (
                <div key={index} className="text-sm">• {pattern}</div>
              ))}
            </div>
          </div>
        )}

        {/* AI Observations */}
        {profile && (
          <div className="p-6 border border-white/10 rounded-lg">
            <div className="text-sm text-gray-400 mb-3">AI Observations</div>
            <div className="space-y-2">
              {profile.aiObservations.map((observation, index) => (
                <div key={index} className="text-sm italic text-gray-300">• {observation}</div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
