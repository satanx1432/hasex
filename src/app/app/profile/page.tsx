'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { getUserStats } from '@/lib/data/goals'

interface ProfileData {
  name: string
  daysActive: number
  currentStreak: number
  consistency: number
  subtitle: string
  stats: {
    daysActive: number
    tasksCompleted: number
    phasesCompleted: number
    destinationsActive: number
    longestStreak: number
    consistency: number
  }
  settings: {
    theme: 'light' | 'dark'
    notifications: boolean
    aiVoice: boolean
  }
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({ completed: 0, rate: 0, streak: 0, total: 0 })
  const { user, isGuest } = useAuth()
  const router = useRouter()

  useEffect(() => {
    loadProfile()
  }, [user, isGuest])

  const loadProfile = async () => {
    if (!user && !isGuest) {
      setIsLoading(false)
      return
    }

    try {
      const userId = user?.id || 'guest'
      const userStats = await getUserStats(userId)
      setStats(userStats)

      const normalizedGoal = sessionStorage.getItem('userGoal') || ''
      
      setProfile({
        name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'User',
        daysActive: userStats.total,
        currentStreak: userStats.streak,
        consistency: userStats.rate,
        subtitle: normalizedGoal,
        stats: {
          daysActive: userStats.total,
          tasksCompleted: userStats.completed,
          phasesCompleted: 0,
          destinationsActive: normalizedGoal ? 1 : 0,
          longestStreak: userStats.streak,
          consistency: userStats.rate
        },
        settings: {
          theme: 'dark',
          notifications: true,
          aiVoice: false
        }
      })
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleThemeToggle = () => {
    if (profile) {
      setProfile({
        ...profile,
        settings: {
          ...profile.settings,
          theme: profile.settings.theme === 'light' ? 'dark' : 'light'
        }
      })
    }
  }

  const handleNotificationToggle = () => {
    if (profile) {
      setProfile({
        ...profile,
        settings: {
          ...profile.settings,
          notifications: !profile.settings.notifications
        }
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-[850px] mx-auto px-6 py-8">
        <div className="mb-12">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-surface border border-border flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-3xl" data-icon="person">person</span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary mb-2">
                {profile?.name || 'User'}
              </h1>
              <div className="flex items-center gap-6 text-on-surface-variant">
                <span>Day {profile?.daysActive ?? 0}</span>
                <span>Streak: {profile?.currentStreak ?? 0}</span>
                <span>Consistency: {profile?.consistency ?? 0}%</span>
              </div>
            </div>
          </div>
          {profile?.subtitle && (
            <p className="text-xl text-on-surface-variant">{profile.subtitle}</p>
          )}
        </div>

        <div className="mb-12">
          <h2 className="text-sm font-semibold text-on-surface-variant mb-6 tracking-wide uppercase">PROGRESS STATS</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <div className="bg-surface border border-border p-6 text-center">
              <div className="text-3xl font-bold text-primary">{profile?.stats.daysActive ?? 0}</div>
              <div className="text-sm text-on-surface-variant mt-2">Days Active</div>
            </div>
            <div className="bg-surface border border-border p-6 text-center">
              <div className="text-3xl font-bold text-primary">{profile?.stats.tasksCompleted ?? 0}</div>
              <div className="text-sm text-on-surface-variant mt-2">Tasks Completed</div>
            </div>
            <div className="bg-surface border border-border p-6 text-center">
              <div className="text-3xl font-bold text-primary">{profile?.stats.phasesCompleted ?? 0}</div>
              <div className="text-sm text-on-surface-variant mt-2">Phases Completed</div>
            </div>
            <div className="bg-surface border border-border p-6 text-center">
              <div className="text-3xl font-bold text-primary">{profile?.stats.destinationsActive ?? 0}</div>
              <div className="text-sm text-on-surface-variant mt-2">Destinations Active</div>
            </div>
            <div className="bg-surface border border-border p-6 text-center">
              <div className="text-3xl font-bold text-primary">{profile?.stats.longestStreak ?? 0}</div>
              <div className="text-sm text-on-surface-variant mt-2">Longest Streak</div>
            </div>
            <div className="bg-surface border border-border p-6 text-center">
              <div className="text-3xl font-bold text-primary">{profile?.stats.consistency ?? 0}%</div>
              <div className="text-sm text-on-surface-variant mt-2">Consistency</div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-sm font-semibold text-on-surface-variant mb-6 tracking-wide uppercase">SETTINGS</h2>
          <div className="bg-surface border border-border">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-primary">Notifications</div>
                <div className="text-sm text-on-surface-variant">Enable daily reminders</div>
              </div>
              <button
                onClick={handleNotificationToggle}
                className={`w-14 h-8 border border-border transition-colors cursor-pointer relative ${
                  profile?.settings.notifications ? 'bg-primary' : 'bg-surface-container-high'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-background absolute top-1 transition-transform ${
                    profile?.settings.notifications ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="p-6 flex items-center justify-between">
              <div>
                <div className="font-semibold text-primary">Export Data</div>
                <div className="text-sm text-on-surface-variant">Download your data</div>
              </div>
              <button
                onClick={() => alert('Export functionality coming soon')}
                className="px-4 py-2 bg-surface-container-low border border-border text-primary hover:border-primary transition-colors cursor-pointer"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}