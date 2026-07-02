'use client'

import { useState, useEffect, useTransition } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { getUserStats, getTaskCompletions } from '@/lib/data/goals'
import { getGuestSettings, saveGuestSettings, exportGuestData } from '@/lib/data/guest-data'
import { createClient } from '@/lib/supabase/client'
import { ProfilePageSkeleton } from '@/components/skeletons'
import { computeSigmaScore, getTier } from '@/lib/sigma'
import { ArrowLeft, User, Check, Trophy, Target, TrendingUp, Zap, Award, Clock, LogOut, Settings, Download } from 'lucide-react'

interface Settings {
  theme: 'light' | 'dark'
  notifications: boolean
  aiVoice: boolean
  dailyReminders: boolean
  weeklyReports: boolean
  publicProfile: boolean
  dataSharing: boolean
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  unlockedAt?: string
}

export default function Profile() {
  const [isPending, startTransition] = useTransition()
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fadeIn, setFadeIn] = useState(false)
  const [stats, setStats] = useState({ completed: 0, rate: 0, streak: 0, total: 0, daysActive: 0 })
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    notifications: true,
    aiVoice: false,
    dailyReminders: true,
    weeklyReports: true,
    publicProfile: false,
    dataSharing: false
  })
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [taskHistory, setTaskHistory] = useState<any[]>([])
  const [sigmaScore, setSigmaScore] = useState(500)
  const [sigmaTier, setSigmaTier] = useState({ tier: 'Novice', sub: 'Bronze', percentile: 95 })
  const { user, isGuest, signOut, upgradeToAccount } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [user, isGuest])

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => setFadeIn(true), 50)
    }
  }, [isLoading])

  const loadProfile = async () => {
    if (!user && !isGuest) {
      setIsLoading(false)
      return
    }

    try {
      const userId = isGuest ? 'guest' : user?.id
      if (!userId) {
        setIsLoading(false)
        return
      }

      const [userStats, completions] = await Promise.all([
        getUserStats(userId),
        getTaskCompletions(userId, 30)
      ])

      setStats({
        ...userStats,
        daysActive: userStats.daysActive || userStats.total || 1
      })

      setTaskHistory(completions || [])

      const theta = Math.log1p(userStats.completed) * 0.3 + (userStats.rate / 100) * 2 + Math.log1p(userStats.streak) * 0.5 - 1
      const score = computeSigmaScore(Math.max(-3, Math.min(8, theta)))
      const tier = getTier(score)
      setSigmaScore(score)
      setSigmaTier(tier)

      const loadedSettings = isGuest 
        ? await getGuestSettings()
        : await loadSupabaseSettings()

      setSettings(loadedSettings)

      setProfile({
        name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'Guest',
        daysActive: userStats.daysActive || userStats.total || 1,
        currentStreak: userStats.streak,
        consistency: userStats.rate
      })

      setAchievements(generateAchievements(userStats, completions || []))
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSupabaseSettings = async (): Promise<Settings> => {
    if (!user?.id) return settings
    try {
      const { data }: { data: { settings?: Settings } | null } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()
      
      return data?.settings || {
        theme: 'dark',
        notifications: true,
        aiVoice: false,
        dailyReminders: true,
        weeklyReports: true,
        publicProfile: false,
        dataSharing: false
      }
    } catch {
      return settings
    }
  }

  const generateAchievements = (stats: any, completions: any[]): Achievement[] => {
    const allAchievements: Achievement[] = [
      { id: 'first_task', title: 'First Step', description: 'Complete your first task', icon: 'Target', unlocked: stats.completed >= 1 },
      { id: 'streak_3', title: 'Consistent', description: 'Maintain a 3-day streak', icon: 'Zap', unlocked: stats.streak >= 3 },
      { id: 'streak_7', title: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'TrendingUp', unlocked: stats.streak >= 7 },
      { id: 'tasks_10', title: 'Getting Started', description: 'Complete 10 tasks', icon: 'Check', unlocked: stats.completed >= 10 },
      { id: 'tasks_50', title: 'Halfway There', description: 'Complete 50 tasks', icon: 'Award', unlocked: stats.completed >= 50 },
      { id: 'tasks_100', title: 'Century', description: 'Complete 100 tasks', icon: 'Trophy', unlocked: stats.completed >= 100 },
      { id: 'rate_80', title: 'Efficient', description: 'Achieve 80% completion rate', icon: 'TrendingUp', unlocked: stats.rate >= 80 },
      { id: 'rate_100', title: 'Perfectionist', description: 'Achieve 100% completion rate', icon: 'Award', unlocked: stats.rate >= 100 && stats.total >= 10 },
    ]

    return allAchievements
  }

  const saveSettings = async (newSettings: Settings) => {
    setSettings(newSettings)
    setSettingsSaved(true)

    if (isGuest) {
      await saveGuestSettings(newSettings)
    } else if (user?.id) {
      await (supabase as any)
        .from('profiles')
        .update({ settings: newSettings })
        .eq('id', user.id)
    }

    setTimeout(() => setSettingsSaved(false), 2000)
  }

  const handleSignOut = async () => {
    await signOut()
    startTransition(() => router.push('/'))
  }

  const handleExportData = async () => {
    if (isGuest) {
      const data = await exportGuestData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'guest-data.json'
      a.click()
    } else {
      alert('Export functionality coming soon')
    }
  }

  if (isLoading) {
    return <ProfilePageSkeleton />
  }

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'Target': return Target
      case 'Zap': return Zap
      case 'TrendingUp': return TrendingUp
      case 'Check': return Check
      case 'Award': return Award
      case 'Trophy': return Trophy
      default: return Award
    }
  }

  return (
    <div className={`min-h-screen bg-background pb-24 transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <div className="max-w-[900px] mx-auto px-4 py-8 md:px-6">
        
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => startTransition(() => router.back())}
            className="text-white hover:opacity-70 transition-opacity"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <div className="w-6" />
        </div>

        {settingsSaved && (
          <div className="fixed top-4 right-4 bg-white text-black px-4 py-2 rounded-lg text-sm flex items-center gap-2 z-50">
            <Check size={16} />
            Settings saved
          </div>
        )}

        {isGuest && (
          <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={18} className="text-white" />
                <p className="text-sm text-gray-400">
                  Guest mode - data stored locally on this device.
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
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-gray-900 border border-gray-800 flex items-center justify-center rounded-full">
              <User size={32} className="text-gray-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">
                {profile?.name || 'User'}
              </h1>
              <div className="flex items-center gap-6 text-gray-400">
                <span>Day {profile?.daysActive ?? 1}</span>
                <span>Streak: {profile?.currentStreak ?? 0}</span>
                <span>Consistency: {profile?.consistency ?? 0}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-sm font-semibold text-gray-400 mb-6 tracking-wide uppercase">SIGMA Ranking</h2>
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{sigmaScore}</p>
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold text-white">{sigmaTier.tier} {sigmaTier.sub}</p>
                <p className="text-sm text-gray-400">Top {sigmaTier.percentile}% of users</p>
                <p className="text-xs text-gray-500 mt-1">Days Active: {profile?.daysActive ?? 1}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-sm font-semibold text-gray-400 mb-6 tracking-wide uppercase">PROGRESS STATS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 p-6 text-center rounded-lg">
              <Target size={20} className="mx-auto text-gray-400 mb-2" />
              <div className="text-3xl font-bold text-white">{stats.completed}</div>
              <div className="text-sm text-gray-400 mt-2">Tasks Completed</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-6 text-center rounded-lg">
              <TrendingUp size={20} className="mx-auto text-gray-400 mb-2" />
              <div className="text-3xl font-bold text-white">{stats.rate}%</div>
              <div className="text-sm text-gray-400 mt-2">Completion Rate</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-6 text-center rounded-lg">
              <Zap size={20} className="mx-auto text-gray-400 mb-2" />
              <div className="text-3xl font-bold text-white">{stats.streak}</div>
              <div className="text-sm text-gray-400 mt-2">Current Streak</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-6 text-center rounded-lg">
              <Award size={20} className="mx-auto text-gray-400 mb-2" />
              <div className="text-3xl font-bold text-white">{stats.daysActive || stats.total || 1}</div>
              <div className="text-sm text-gray-400 mt-2">Days Active</div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-sm font-semibold text-gray-400 mb-6 tracking-wide uppercase">ACHIEVEMENTS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {achievements.map((achievement) => {
              const Icon = getAchievementIcon(achievement.icon)
              return (
                <div
                  key={achievement.id}
                  className={`p-4 border text-center transition-all rounded-lg ${
                    achievement.unlocked 
                      ? 'bg-gray-900 border-gray-700' 
                      : 'bg-gray-900/50 border-gray-800 opacity-50'
                  }`}
                >
                  <Icon size={28} className={`mx-auto ${achievement.unlocked ? 'text-white' : 'text-gray-600'}`} />
                  <p className={`text-sm font-semibold mt-2 ${achievement.unlocked ? 'text-white' : 'text-gray-500'}`}>
                    {achievement.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{achievement.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-sm font-semibold text-gray-400 mb-6 tracking-wide uppercase">RECENT HISTORY</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg">
            {taskHistory.length > 0 ? (
              taskHistory.slice(0, 10).map((task, index) => (
                <div 
                  key={task.id || index} 
                  className="p-4 border-b border-gray-800 last:border-b-0 flex items-center gap-4"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    task.status === 'completed' ? 'bg-green-500/20' : 'bg-gray-800'
                  }`}>
                    {task.status === 'completed' ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Clock size={16} className="text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${task.status === 'completed' ? 'text-gray-300' : 'text-gray-500'}`}>
                      {task.task?.title || 'Task'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {task.completed_at ? new Date(task.completed_at).toLocaleDateString() : 'Incomplete'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    task.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-500">No task history yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-sm font-semibold text-gray-400 mb-6 tracking-wide uppercase">SETTINGS</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings size={18} className="text-gray-400" />
                <div>
                  <div className="font-semibold text-white">Notifications</div>
                  <div className="text-sm text-gray-400">Enable push notifications</div>
                </div>
              </div>
              <button
                onClick={() => saveSettings({ ...settings, notifications: !settings.notifications })}
                className={`w-14 h-8 border border-gray-700 transition-colors cursor-pointer relative rounded ${
                  settings.notifications ? 'bg-white' : 'bg-gray-800'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-black absolute top-1 transition-transform ${
                    settings.notifications ? 'translate-x-7' : 'translate-x-1'
                  } rounded`}
                />
              </button>
            </div>

            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-gray-400" />
                <div>
                  <div className="font-semibold text-white">Daily Reminders</div>
                  <div className="text-sm text-gray-400">Get daily task reminders</div>
                </div>
              </div>
              <button
                onClick={() => saveSettings({ ...settings, dailyReminders: !settings.dailyReminders })}
                className={`w-14 h-8 border border-gray-700 transition-colors cursor-pointer relative rounded ${
                  settings.dailyReminders ? 'bg-white' : 'bg-gray-800'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-black absolute top-1 transition-transform ${
                    settings.dailyReminders ? 'translate-x-7' : 'translate-x-1'
                  } rounded`}
                />
              </button>
            </div>

            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp size={18} className="text-gray-400" />
                <div>
                  <div className="font-semibold text-white">Weekly Reports</div>
                  <div className="text-sm text-gray-400">Receive weekly progress summaries</div>
                </div>
              </div>
              <button
                onClick={() => saveSettings({ ...settings, weeklyReports: !settings.weeklyReports })}
                className={`w-14 h-8 border border-gray-700 transition-colors cursor-pointer relative rounded ${
                  settings.weeklyReports ? 'bg-white' : 'bg-gray-800'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-black absolute top-1 transition-transform ${
                    settings.weeklyReports ? 'translate-x-7' : 'translate-x-1'
                  } rounded`}
                />
              </button>
            </div>

            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User size={18} className="text-gray-400" />
                <div>
                  <div className="font-semibold text-white">Public Profile</div>
                  <div className="text-sm text-gray-400">Show your progress on leaderboard</div>
                </div>
              </div>
              <button
                onClick={() => saveSettings({ ...settings, publicProfile: !settings.publicProfile })}
                className={`w-14 h-8 border border-gray-700 transition-colors cursor-pointer relative rounded ${
                  settings.publicProfile ? 'bg-white' : 'bg-gray-800'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-black absolute top-1 transition-transform ${
                    settings.publicProfile ? 'translate-x-7' : 'translate-x-1'
                  } rounded`}
                />
              </button>
            </div>

            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download size={18} className="text-gray-400" />
                <div>
                  <div className="font-semibold text-white">Data Sharing</div>
                  <div className="text-sm text-gray-400">Share anonymous data for improvements</div>
                </div>
              </div>
              <button
                onClick={() => saveSettings({ ...settings, dataSharing: !settings.dataSharing })}
                className={`w-14 h-8 border border-gray-700 transition-colors cursor-pointer relative rounded ${
                  settings.dataSharing ? 'bg-white' : 'bg-gray-800'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-black absolute top-1 transition-transform ${
                    settings.dataSharing ? 'translate-x-7' : 'translate-x-1'
                  } rounded`}
                />
              </button>
            </div>

            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download size={18} className="text-gray-400" />
                <div>
                  <div className="font-semibold text-white">Export Data</div>
                  <div className="text-sm text-gray-400">Download your data</div>
                </div>
              </div>
              <button
                onClick={handleExportData}
                className="px-4 py-2 bg-gray-800 border border-gray-700 text-white hover:border-gray-600 transition-colors cursor-pointer rounded-lg flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSignOut}
            className="w-full py-4 bg-gray-900 border border-gray-800 text-white font-semibold hover:border-gray-700 transition-colors cursor-pointer rounded-lg flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        <div className="text-center text-gray-500 text-sm py-8">
          <p>Behavioral OS v1.0</p>
        </div>
      </div>
    </div>
  )
}