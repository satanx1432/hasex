import { NVIDIANIMService } from '../ai/nvidia-nim'
import { DatabaseService } from '../supabase/database'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: 'streak' | 'completion' | 'consistency' | 'mastery' | 'social'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  points: number
  unlocked_at?: string
  progress: number
  max_progress: number
  requirements: string[]
}

export interface UserGamificationProfile {
  user_id: string
  total_points: number
  level: number
  xp_to_next_level: number
  current_xp: number
  achievements: Achievement[]
  current_streak: number
  longest_streak: number
  total_tasks_completed: number
  total_goals_completed: number
  collection_completion: number
  badges: Badge[]
  leaderboards: LeaderboardEntry[]
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlocked_at: string
  tier: 'bronze' | 'silver' | 'gold' | 'diamond'
}

export interface LeaderboardEntry {
  leaderboard_id: string
  leaderboard_name: string
  rank: number
  score: number
  tier: string
}

export interface SocialProfile {
  user_id: string
  username: string
  avatar?: string
  bio?: string
  display_stats: boolean
  friends: string[]
  achievements_shared: string[]
  public_badges: string[]
}

export interface CollectionItem {
  id: string
  name: string
  description: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  icon: string
  unlocked: boolean
  unlocked_at?: string
  collection_progress: number
}

export interface GamificationEvent {
  event_type: 'task_completed' | 'goal_completed' | 'streak_achieved' | 'quiz_passed' | 'social_action'
  user_id: string
  event_data: any
  timestamp: string
}

export class GamificationSystem {
  private nvidiaService: NVIDIANIMService
  private baseXPPerTask = 10
  private baseXPPerGoal = 100
  private streakMultiplier = 1.5
  private db: DatabaseService

  constructor() {
    this.nvidiaService = new NVIDIANIMService()
    this.db = new DatabaseService()
  }

  async processEvent(event: GamificationEvent): Promise<{
    xp_gained: number
    achievements_unlocked: Achievement[]
    level_up: boolean
    new_level?: number
  }> {
    let xpGained = 0
    const achievementsUnlocked: Achievement[] = []
    let levelUp = false
    let newLevel

    switch (event.event_type) {
      case 'task_completed':
        xpGained = this.calculateTaskXP(event.event_data)
        break
      case 'goal_completed':
        xpGained = this.calculateGoalXP(event.event_data)
        break
      case 'streak_achieved':
        xpGained = this.calculateStreakXP(event.event_data)
        break
      case 'quiz_passed':
        xpGained = this.calculateQuizXP(event.event_data)
        break
      case 'social_action':
        xpGained = this.calculateSocialXP(event.event_data)
        break
    }

    // Check for achievements
    const achievements = await this.checkAchievements(event.user_id, event)
    achievementsUnlocked.push(...achievements)

    // Save unlocked achievements to database
    for (const achievement of achievementsUnlocked) {
      try {
        await this.db.unlockAchievement(event.user_id, achievement.id)
      } catch (error) {
        console.error('Failed to save achievement:', error)
      }
    }

    // Check for level up
    const userProfile = await this.getUserProfile(event.user_id)
    const totalXP = userProfile.current_xp + xpGained
    if (totalXP >= userProfile.xp_to_next_level) {
      levelUp = true
      newLevel = userProfile.level + 1
    }

    // Update profile with new XP and stats
    const profileUpdates: any = {
      current_xp: totalXP,
    }

    if (levelUp && newLevel) {
      profileUpdates.level = newLevel
      profileUpdates.xp_to_next_level = this.calculateXPForLevel(newLevel + 1)
      profileUpdates.current_xp = totalXP - userProfile.xp_to_next_level
    }

    if (event.event_type === 'task_completed') {
      profileUpdates.total_tasks_completed = userProfile.total_tasks_completed + 1
    } else if (event.event_type === 'goal_completed') {
      profileUpdates.total_goals_completed = userProfile.total_goals_completed + 1
    }

    await this.db.updateGamificationProfile(event.user_id, profileUpdates)

    return {
      xp_gained: xpGained,
      achievements_unlocked: achievementsUnlocked,
      level_up: levelUp,
      new_level: newLevel,
    }
  }

  private calculateXPForLevel(level: number): number {
    // Exponential XP curve: 100 * level^1.5
    return Math.round(100 * Math.pow(level, 1.5))
  }

  private calculateTaskXP(taskData: any): number {
    let xp = this.baseXPPerTask

    // Difficulty bonus
    if (taskData.difficulty_score) {
      xp *= 1 + (taskData.difficulty_score / 10) * 0.5
    }

    // Streak bonus
    if (taskData.current_streak) {
      xp *= this.streakMultiplier
    }

    // Speed bonus (completed faster than estimated)
    if (taskData.estimated_time && taskData.actual_time && taskData.actual_time < taskData.estimated_time) {
      xp *= 1.2
    }

    return Math.round(xp)
  }

  private calculateGoalXP(goalData: any): number {
    let xp = this.baseXPPerGoal

    // Goal complexity bonus
    if (goalData.complexity_score) {
      xp *= 1 + (goalData.complexity_score / 10) * 0.3
    }

    // Time bonus (completed ahead of schedule)
    if (goalData.target_date && goalData.completed_at) {
      const targetDate = new Date(goalData.target_date)
      const completedDate = new Date(goalData.completed_at)
      if (completedDate < targetDate) {
        xp *= 1.5
      }
    }

    return Math.round(xp)
  }

  private calculateStreakXP(streakData: any): number {
    const streakLength = streakData.streak_length || 0
    return Math.round(this.baseXPPerTask * streakLength * 0.5)
  }

  private calculateQuizXP(quizData: any): number {
    const baseXP = 15
    const scoreMultiplier = quizData.score || 0
    return Math.round(baseXP * scoreMultiplier)
  }

  private calculateSocialXP(socialData: any): number {
    const baseXP = 5
    return baseXP
  }

  async getUserProfile(userId: string): Promise<UserGamificationProfile> {
    const profile = await this.db.getGamificationProfile(userId)
    
    if (!profile) {
      throw new Error('Failed to get or create gamification profile')
    }

    return {
      user_id: profile.user_id,
      total_points: profile.total_points,
      level: profile.level,
      xp_to_next_level: profile.xp_to_next_level,
      current_xp: profile.current_xp,
      achievements: await this.getUserAchievements(userId),
      current_streak: profile.current_streak,
      longest_streak: profile.longest_streak,
      total_tasks_completed: profile.total_tasks_completed,
      total_goals_completed: profile.total_goals_completed,
      collection_completion: 35,
      badges: await this.getUserBadges(userId),
      leaderboards: await this.getLeaderboardEntries(userId),
    }
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    const dbAchievements = await this.db.getAchievements(userId)
    const allAchievements = await this.getAllAchievements()
    
    // Merge database achievements with achievement definitions
    return dbAchievements.map(dbAchievement => {
      const definition = allAchievements.find(a => a.id === dbAchievement.achievement_id)
      return {
        ...definition,
        unlocked_at: dbAchievement.unlocked_at,
        progress: dbAchievement.progress,
      }
    }).filter(a => a.unlocked_at) as Achievement[]
  }

  async getAllAchievements(): Promise<Achievement[]> {
    return [
      {
        id: 'first_task',
        title: 'First Steps',
        description: 'Complete your first task',
        icon: 'directions_walk',
        category: 'completion',
        rarity: 'common',
        points: 10,
        progress: 1,
        max_progress: 1,
        requirements: ['Complete 1 task'],
        unlocked_at: new Date().toISOString(),
      },
      {
        id: 'streak_7',
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: 'local_fire_department',
        category: 'streak',
        rarity: 'rare',
        points: 50,
        progress: 7,
        max_progress: 7,
        requirements: ['Complete tasks for 7 consecutive days'],
        unlocked_at: new Date().toISOString(),
      },
      {
        id: 'streak_30',
        title: 'Monthly Master',
        description: 'Maintain a 30-day streak',
        icon: 'emoji_events',
        category: 'streak',
        rarity: 'epic',
        points: 200,
        progress: 7,
        max_progress: 30,
        requirements: ['Complete tasks for 30 consecutive days'],
      },
      {
        id: 'goal_complete',
        title: 'Goal Getter',
        description: 'Complete your first goal',
        icon: 'flag',
        category: 'completion',
        rarity: 'rare',
        points: 100,
        progress: 1,
        max_progress: 1,
        requirements: ['Complete 1 goal'],
        unlocked_at: new Date().toISOString(),
      },
      {
        id: 'quiz_master',
        title: 'Quiz Master',
        description: 'Score 100% on 5 quizzes',
        icon: 'school',
        category: 'mastery',
        rarity: 'epic',
        points: 150,
        progress: 3,
        max_progress: 5,
        requirements: ['Get 100% on 5 different quizzes'],
      },
      {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Complete 10 tasks before 9 AM',
        icon: 'wb_sunny',
        category: 'consistency',
        rarity: 'rare',
        points: 75,
        progress: 6,
        max_progress: 10,
        requirements: ['Complete 10 tasks before 9 AM'],
      },
      {
        id: 'night_owl',
        title: 'Night Owl',
        description: 'Complete 10 tasks after 9 PM',
        icon: 'nights_stay',
        category: 'consistency',
        rarity: 'rare',
        points: 75,
        progress: 2,
        max_progress: 10,
        requirements: ['Complete 10 tasks after 9 PM'],
      },
      {
        id: 'social_butterfly',
        title: 'Social Butterfly',
        description: 'Share 5 achievements with friends',
        icon: 'share',
        category: 'social',
        rarity: 'common',
        points: 25,
        progress: 2,
        max_progress: 5,
        requirements: ['Share 5 achievements'],
      },
      {
        id: 'perfectionist',
        title: 'Perfectionist',
        description: 'Complete 20 tasks with 100% accuracy',
        icon: 'verified',
        category: 'mastery',
        rarity: 'legendary',
        points: 300,
        progress: 8,
        max_progress: 20,
        requirements: ['Complete 20 tasks with perfect scores'],
      },
      {
        id: 'speed_demon',
        title: 'Speed Demon',
        description: 'Complete 10 tasks in half the estimated time',
        icon: 'bolt',
        category: 'completion',
        rarity: 'epic',
        points: 120,
        progress: 4,
        max_progress: 10,
        requirements: ['Complete 10 tasks in half the estimated time'],
      },
    ]
  }

  async getUserBadges(userId: string): Promise<Badge[]> {
    return [
      {
        id: 'badge_starter',
        name: 'Starter',
        description: 'Complete your first task',
        icon: 'rocket_launch',
        unlocked_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        tier: 'bronze',
      },
      {
        id: 'badge_consistent',
        name: 'Consistent',
        description: 'Maintain a 7-day streak',
        icon: 'trending_up',
        unlocked_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        tier: 'silver',
      },
    ]
  }

  async getLeaderboardEntries(userId: string): Promise<LeaderboardEntry[]> {
    return [
      {
        leaderboard_id: 'weekly_streaks',
        leaderboard_name: 'Weekly Streaks',
        rank: 15,
        score: 7,
        tier: 'silver',
      },
      {
        leaderboard_id: 'total_points',
        leaderboard_name: 'Total Points',
        rank: 42,
        score: 1250,
        tier: 'bronze',
      },
    ]
  }

  async checkAchievements(userId: string, event: GamificationEvent): Promise<Achievement[]> {
    const unlocked: Achievement[] = []
    const allAchievements = await this.getAllAchievements()
    const userAchievements = await this.getUserAchievements(userId)

    for (const achievement of allAchievements) {
      if (userAchievements.find(a => a.id === achievement.id)) continue

      const shouldUnlock = await this.evaluateAchievement(achievement, event, userId)
      if (shouldUnlock) {
        unlocked.push({
          ...achievement,
          unlocked_at: new Date().toISOString(),
          progress: achievement.max_progress,
        })
      }
    }

    return unlocked
  }

  private async evaluateAchievement(
    achievement: Achievement,
    event: GamificationEvent,
    userId: string
  ): Promise<boolean> {
    // In production, this would check actual user data
    // For now, return some sample logic
    switch (achievement.id) {
      case 'first_task':
        return event.event_type === 'task_completed'
      case 'streak_7':
        return event.event_type === 'streak_achieved' && event.event_data.streak_length >= 7
      case 'goal_complete':
        return event.event_type === 'goal_completed'
      default:
        return false
    }
  }

  async getCollectionItems(userId: string): Promise<CollectionItem[]> {
    return [
      {
        id: 'collection_1',
        name: 'Task Master',
        description: 'Complete 100 tasks',
        category: 'tasks',
        rarity: 'rare',
        icon: 'task_alt',
        unlocked: false,
        collection_progress: 45,
      },
      {
        id: 'collection_2',
        name: 'Goal Crusher',
        description: 'Complete 10 goals',
        category: 'goals',
        rarity: 'epic',
        icon: 'military_tech',
        unlocked: false,
        collection_progress: 2,
      },
      {
        id: 'collection_3',
        name: 'Streak Keeper',
        description: 'Reach a 30-day streak',
        category: 'streaks',
        rarity: 'legendary',
        icon: 'local_fire_department',
        unlocked: false,
        collection_progress: 7,
      },
      {
        id: 'collection_4',
        name: 'Quiz Ace',
        description: 'Pass 20 quizzes',
        category: 'quizzes',
        rarity: 'rare',
        icon: 'psychology',
        unlocked: false,
        collection_progress: 8,
      },
    ]
  }

  async getLeaderboard(leaderboardId: string, limit: number = 10): Promise<any[]> {
    // Mock leaderboard data
    return [
      { rank: 1, username: 'Achiever123', score: 5000, tier: 'diamond' },
      { rank: 2, username: 'GoalMaster', score: 4500, tier: 'diamond' },
      { rank: 3, username: 'StreakKing', score: 4200, tier: 'gold' },
      { rank: 4, username: 'TaskQueen', score: 3800, tier: 'gold' },
      { rank: 5, username: 'ConsistentJoe', score: 3500, tier: 'gold' },
      { rank: 6, username: 'ProductivityPro', score: 3200, tier: 'silver' },
      { rank: 7, username: 'HabitBuilder', score: 2900, tier: 'silver' },
      { rank: 8, username: 'FocusMaster', score: 2600, tier: 'silver' },
      { rank: 9, username: 'MindfulOne', score: 2300, tier: 'bronze' },
      { rank: 10, username: 'GrowthSeeker', score: 2000, tier: 'bronze' },
    ].slice(0, limit)
  }

  async getSocialProfile(userId: string): Promise<SocialProfile> {
    return {
      user_id: userId,
      username: 'User123',
      avatar: undefined,
      bio: 'Building better habits, one task at a time',
      display_stats: true,
      friends: ['friend1', 'friend2', 'friend3'],
      achievements_shared: ['first_task', 'streak_7'],
      public_badges: ['badge_starter', 'badge_consistent'],
    }
  }

  async shareAchievement(userId: string, achievementId: string): Promise<boolean> {
    // In production, this would share to social features
    console.log(`Sharing achievement ${achievementId} for user ${userId}`)
    return true
  }

  async generateAchievementSuggestion(userId: string): Promise<string> {
    const profile = await this.getUserProfile(userId)
    const achievements = await this.getAllAchievements()

    const lockedAchievements = achievements.filter(a => !a.unlocked_at)
    const closestAchievement = lockedAchievements.sort((a, b) => {
      const progressA = a.progress / a.max_progress
      const progressB = b.progress / b.max_progress
      return progressB - progressA
    })[0]

    if (closestAchievement) {
      const progress = Math.round((closestAchievement.progress / closestAchievement.max_progress) * 100)
      return `You're ${progress}% of the way to "${closestAchievement.title}"! ${closestAchievement.description}`
    }

    return 'Keep completing tasks to unlock new achievements!'
  }
}
