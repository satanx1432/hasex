'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GamificationSystem, Achievement, Badge, CollectionItem } from '@/lib/gamification/gamification-system'

export default function GamificationPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'achievements' | 'badges' | 'collection' | 'leaderboard'>('achievements')
  const [profile, setProfile] = useState<any>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [collection, setCollection] = useState<CollectionItem[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [suggestion, setSuggestion] = useState<string | null>(null)

  const gamificationSystem = new GamificationSystem()

  useEffect(() => {
    loadGamificationData()
  }, [])

  const loadGamificationData = async () => {
    setIsLoading(true)
    try {
      const userProfile = await gamificationSystem.getUserProfile('user_123')
      setProfile(userProfile)

      const allAchievements = await gamificationSystem.getAllAchievements()
      setAchievements(allAchievements)

      const userBadges = await gamificationSystem.getUserBadges('user_123')
      setBadges(userBadges)

      const collectionItems = await gamificationSystem.getCollectionItems('user_123')
      setCollection(collectionItems)

      const leaderboardData = await gamificationSystem.getLeaderboard('total_points', 10)
      setLeaderboard(leaderboardData)

      const achievementSuggestion = await gamificationSystem.generateAchievementSuggestion('user_123')
      setSuggestion(achievementSuggestion)
    } catch (error) {
      console.error('Failed to load gamification data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'text-on-surface border-on-surface'
      case 'rare':
        return 'text-primary border-primary'
      case 'epic':
        return 'text-secondary border-secondary'
      case 'legendary':
        return 'text-tertiary border-tertiary'
      default:
        return 'text-on-surface border-on-surface'
    }
  }

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-surface'
      case 'rare':
        return 'bg-primary-container'
      case 'epic':
        return 'bg-secondary-container'
      case 'legendary':
        return 'bg-tertiary-container'
      default:
        return 'bg-surface'
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'text-amber-600'
      case 'silver':
        return 'text-gray-400'
      case 'gold':
        return 'text-yellow-500'
      case 'diamond':
        return 'text-cyan-400'
      default:
        return 'text-on-surface'
    }
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
          <button
            onClick={() => router.back()}
            className="material-symbols-outlined text-primary"
            data-icon="arrow_back"
          >
            arrow_back
          </button>
          <span className="font-label-mono text-label-mono tracking-widest text-primary">Progress</span>
          <div className="w-6" />
        </nav>
      </header>

      <main className="pt-24 pb-32 px-grid-margin min-h-screen">
        <div className="max-w-[640px] mx-auto">
          {/* Profile Overview */}
          <section className="mb-stack-lg">
            <div className="bg-surface border border-border p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-background text-3xl" data-icon="person">
                    person
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="font-headline-lg text-headline-lg text-primary mb-1">Level {profile?.level}</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {profile?.current_xp} / {profile?.xp_to_next_level} XP
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-headline-lg text-headline-lg text-primary">{profile?.total_points}</span>
                  <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">Total Points</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="w-full bg-surface-variant h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{
                      width: `${((profile?.current_xp || 0) / (profile?.xp_to_next_level || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <span className="font-headline-lg text-headline-lg text-primary">{profile?.current_streak}</span>
                  <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">Day Streak</p>
                </div>
                <div className="text-center">
                  <span className="font-headline-lg text-headline-lg text-primary">
                    {profile?.total_tasks_completed}
                  </span>
                  <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">Tasks</p>
                </div>
                <div className="text-center">
                  <span className="font-headline-lg text-headline-lg text-primary">
                    {profile?.total_goals_completed}
                  </span>
                  <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">Goals</p>
                </div>
              </div>
            </div>
          </section>

          {/* Achievement Suggestion */}
          {suggestion && (
            <section className="mb-stack-lg">
              <div className="bg-primary-container border border-primary p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-xl" data-icon="tips_and_updates">
                    tips_and_updates
                  </span>
                  <p className="font-body-md text-body-md text-on-primary-container">{suggestion}</p>
                </div>
              </div>
            </section>
          )}

          {/* Tabs */}
          <section className="mb-stack-lg">
            <div className="flex gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab('achievements')}
                className={`flex-1 py-3 px-4 font-label-mono text-label-mono text-center transition-all ${
                  activeTab === 'achievements'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant'
                }`}
              >
                Achievements
              </button>
              <button
                onClick={() => setActiveTab('badges')}
                className={`flex-1 py-3 px-4 font-label-mono text-label-mono text-center transition-all ${
                  activeTab === 'badges'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant'
                }`}
              >
                Badges
              </button>
              <button
                onClick={() => setActiveTab('collection')}
                className={`flex-1 py-3 px-4 font-label-mono text-label-mono text-center transition-all ${
                  activeTab === 'collection'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant'
                }`}
              >
                Collection
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex-1 py-3 px-4 font-label-mono text-label-mono text-center transition-all ${
                  activeTab === 'leaderboard'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant'
                }`}
              >
                Leaderboard
              </button>
            </div>
          </section>

          {/* Tab Content */}
          {activeTab === 'achievements' && (
            <section className="mb-stack-lg">
              <div className="space-y-3">
                {achievements.map(achievement => (
                  <div
                    key={achievement.id}
                    className={`border p-4 rounded-xl ${
                      achievement.unlocked_at
                        ? `${getRarityBg(achievement.rarity)} ${getRarityColor(achievement.rarity)}`
                        : 'bg-surface border-border opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`material-symbols-outlined text-2xl ${
                          achievement.unlocked_at ? getRarityColor(achievement.rarity) : 'text-on-surface-variant'
                        }`}
                        data-icon={achievement.icon}
                      >
                        {achievement.icon}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-headline-md text-headline-md text-primary">
                            {achievement.title}
                          </h3>
                          <span
                            className={`font-label-mono text-label-mono text-xs px-2 py-1 rounded-full ${getRarityBg(
                              achievement.rarity
                            )} ${getRarityColor(achievement.rarity)}`}
                          >
                            {achievement.rarity.toUpperCase()}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">
                          {achievement.description}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="font-label-mono text-label-mono text-on-surface-variant">
                            +{achievement.points} pts
                          </span>
                          {achievement.unlocked_at && (
                            <span className="material-symbols-outlined text-primary text-sm" data-icon="check_circle">
                              check_circle
                            </span>
                          )}
                        </div>
                        {!achievement.unlocked_at && (
                          <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-body-sm text-body-sm text-on-surface-variant">
                                Progress
                              </span>
                              <span className="font-body-sm text-body-sm text-primary">
                                {achievement.progress} / {achievement.max_progress}
                              </span>
                            </div>
                            <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-primary h-full transition-all duration-500"
                                style={{
                                  width: `${(achievement.progress / achievement.max_progress) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'badges' && (
            <section className="mb-stack-lg">
              <div className="grid grid-cols-2 gap-4">
                {badges.map(badge => (
                  <div key={badge.id} className="bg-surface border border-border p-4 text-center">
                    <span
                      className={`material-symbols-outlined text-4xl mb-2 ${getTierColor(badge.tier)}`}
                      data-icon={badge.icon}
                    >
                      {badge.icon}
                    </span>
                    <h3 className="font-headline-md text-headline-md text-primary mb-1">{badge.name}</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-2">
                      {badge.description}
                    </p>
                    <span
                      className={`font-label-mono text-label-mono text-xs ${getTierColor(badge.tier)}`}
                    >
                      {badge.tier.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'collection' && (
            <section className="mb-stack-lg">
              <div className="space-y-3">
                {collection.map(item => (
                  <div
                    key={item.id}
                    className={`border p-4 rounded-xl ${
                      item.unlocked
                        ? `${getRarityBg(item.rarity)} ${getRarityColor(item.rarity)}`
                        : 'bg-surface border-border opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`material-symbols-outlined text-3xl ${
                          item.unlocked ? getRarityColor(item.rarity) : 'text-on-surface-variant'
                        }`}
                        data-icon={item.icon}
                      >
                        {item.icon}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-headline-md text-headline-md text-primary">{item.name}</h3>
                          {!item.unlocked && (
                            <span
                              className={`font-label-mono text-label-mono text-xs px-2 py-1 rounded-full ${getRarityBg(
                                item.rarity
                              )} ${getRarityColor(item.rarity)}`}
                            >
                              {item.rarity.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {item.description}
                        </p>
                        {!item.unlocked && (
                          <div className="mt-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-body-sm text-body-sm text-on-surface-variant">
                                Collection Progress
                              </span>
                              <span className="font-body-sm text-body-sm text-primary">{item.collection_progress}%</span>
                            </div>
                            <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-primary h-full transition-all duration-500"
                                style={{ width: `${item.collection_progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      {item.unlocked && (
                        <span className="material-symbols-outlined text-primary text-2xl" data-icon="check_circle">
                          check_circle
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'leaderboard' && (
            <section className="mb-stack-lg">
              <div className="bg-surface border border-border p-6">
                <h2 className="font-label-mono text-label-mono text-on-tertiary-container uppercase tracking-widest mb-4">
                  Top Performers
                </h2>
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        index === 0
                          ? 'bg-tertiary-container'
                          : index === 1
                          ? 'bg-secondary-container'
                          : index === 2
                          ? 'bg-primary-container'
                          : 'bg-surface-variant'
                      }`}
                    >
                      <span className="font-headline-lg text-headline-lg text-primary w-8 text-center">
                        {entry.rank}
                      </span>
                      <div className="flex-1">
                        <p className="font-body-md text-body-md text-on-surface">{entry.username}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-headline-md text-headline-md text-primary">{entry.score}</span>
                        <p className="font-label-mono text-label-mono text-on-surface-variant text-xs">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
