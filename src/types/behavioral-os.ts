// ============================================
// BEHAVIORAL OS - CORE TYPES
// Trillion-Dollar Learning Execution Engine
// ============================================

export type UserNiche = 'entrepreneur' | 'medical' | 'legal' | 'tech' | 'trader' | 'creative' | 'general';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned' | 'pivoted';
export type DifficultyLevel = 'stupid_small' | 'easy' | 'medium' | 'hard' | 'extreme';
export type TriggerType = 'time' | 'location' | 'app' | 'event' | 'manual';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'downgraded';
export type InterventionType = 'pivot' | 'downgrade' | 'encourage' | 'analyze' | 'rescue';
export type RewardType = 'points' | 'unlock' | 'badge' | 'level_up' | 'streak_credit';

// ============================================
// USER PROFILE & PREFERENCES
// ============================================
export interface UserPreferences {
  // Tracking preferences
  passiveTracking: boolean;
  integrations: {
    github: boolean;
    health: boolean;
    calendar: boolean;
    screenTime: boolean;
  };
  
  // Notification preferences
  notifications: {
    enabled: boolean;
    quietHours: { start: string; end: string };
    geofencing: boolean;
  };
  
  // Gamification
  stakesEnabled: boolean;
  stakeAmount?: number; // in cents
  skipDaysPerMonth: number;
  
  // Privacy
  socialSharing: boolean;
  peerMatching: boolean;
}

// ============================================
// GOAL & ROADMAP
// ============================================
export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  niche: UserNiche;
  
  // Timeline
  createdAt: Date;
  targetDate?: Date;
  estimatedDays: number;
  currentLevel: number;
  totalLevels: number;
  
  // Status
  status: GoalStatus;
  streakCount: number;
  longestStreak: number;
  
  // AI Analysis
  difficulty: DifficultyLevel;
  failurePatterns: FailurePattern[];
  successRate: number;
  
  // Resources
  resources: CuratedResource[];
  knowledgeGraph: SkillNode[];
  
  // Milestones
  milestones: Milestone[];
  
  // Stakes
  hasStakes: boolean;
  stakeAmount?: number;
  stakesPool?: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  status: 'locked' | 'active' | 'completed';
  tasks: Task[];
  level: number;
  reward?: Reward;
}

export interface Task {
  id: string;
  milestoneId: string;
  title: string;
  description?: string;
  
  // If-Then Implementation
  trigger?: Trigger;
  action?: string;
  
  // Status
  status: TaskStatus;
  difficulty: DifficultyLevel;
  attempts: number;
  completions: number;
  
  // Time
  estimatedMinutes: number;
  actualMinutes?: number;
  scheduledTime?: Date;
  completedAt?: Date;
  
  // AI Analysis
  failureCount: number;
  triggerReliability: number; // 0-100
  isDowngraded: boolean;
  originalDifficulty?: DifficultyLevel;
}

export interface Trigger {
  type: TriggerType;
  condition: string;
  context?: string;
  reliability: number;
  geofence?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

// ============================================
// AI INTERVENTION SYSTEM
// ============================================
export interface Intervention {
  id: string;
  goalId: string;
  type: InterventionType;
  
  // Analysis
  reason: string;
  trigger: InterventionTrigger;
  
  // Action
  suggestedChange: string;
  newTask?: Partial<Task>;
  confidence: number;
  
  // Response
  userResponse?: 'accepted' | 'rejected' | 'modified';
  createdAt: Date;
  resolvedAt?: Date;
}

export interface InterventionTrigger {
  type: 'failure_pattern' | 'engagement_drop' | 'time_exceeded' | 'user_signal' | 'scheduled';
  data: Record<string, any>;
}

export interface FailurePattern {
  pattern: string;
  frequency: number;
  lastOccurrence: Date;
  suggestedFix: string;
}

// ============================================
// RESOURCE CURATOR
// ============================================
export interface CuratedResource {
  id: string;
  title: string;
  type: 'video' | 'article' | 'course' | 'exercise' | 'flashcard';
  url: string;
  
  // AI Analysis
  timeToValue: number; // minutes
  highYieldScore: number; // 0-100
  extractedHighlights?: string[];
  sourceContent?: string;
  
  // Usage
  timesAccessed: number;
  completionRate: number;
  userRating?: number;
  
  // Quality signals
  upvotes: number;
  communityRating: number;
}

export interface ResourceAnalysis {
  resourceId: string;
  keyConcepts: string[];
  examRelevance: number;
  timeEstimate: number;
  highYieldSections: {
    start: number;
    end: number;
    content: string;
  }[];
}

// ============================================
// KNOWLEDGE GRAPH
// ============================================
export interface SkillNode {
  id: string;
  name: string;
  category: string;
  dependencies: string[];
  status: 'not_started' | 'learning' | 'mastered';
  progress: number;
  position: { x: number; y: number };
}

export interface SkillEdge {
  from: string;
  to: string;
  type: 'prerequisite' | 'related' | 'advances';
}

// ============================================
// GAMIFICATION & REWARDS
// ============================================
export interface Reward {
  id: string;
  type: RewardType;
  title: string;
  description: string;
  unlockedAt?: Date;
  requirement: string;
}

export interface GamificationState {
  totalPoints: number;
  currentLevel: number;
  experiencePoints: number;
  pointsToNextLevel: number;
  
  // Streaks
  currentStreak: number;
  longestStreak: number;
  skipDaysRemaining: number;
  
  // Achievements
  badges: Badge[];
  unlockedFeatures: string[];
  
  // Stakes
  activeStakes: Stake[];
  totalWon: number;
  totalLost: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earnedAt?: Date;
  progress: number;
}

export interface Stake {
  id: string;
  goalId: string;
  amount: number;
  status: 'active' | 'won' | 'lost';
  createdAt: Date;
  resolvedAt?: Date;
}

// ============================================
// PEER & SOCIAL
// ============================================
export interface PeerInsight {
  goalId: string;
  anonymizedStats: {
    commonStrugglePoint: string;
    successRate: number;
    peerCount: number;
  };
  encouragement?: string;
}

// ============================================
// ANALYTICS & INSIGHTS
// ============================================
export interface WeeklyReflection {
  week: Date;
  wins: string[];
  struggles: string[];
  patterns: string[];
  adjustments: string[];
  aiCoachingNotes?: string;
}

export interface PerformanceReport {
  goalId: string;
  period: { start: Date; end: Date };
  
  // Completion metrics
  tasksCompleted: number;
  tasksFailed: number;
  completionRate: number;
  
  // Time metrics
  totalTimeSpent: number;
  averageSessionLength: number;
  
  // Pattern analysis
  bestDay: string;
  bestTime: string;
  triggerReliability: number;
  
  // AI insights
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  
  // Progress
  milestonesCompleted: number;
  levelProgress: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  intervention?: Intervention;
}

export interface PlanGenerationRequest {
  goal: string;
  targetDate?: Date;
  resources?: File[] | string[]; // PDF or URLs
  niche: UserNiche;
  preferences: UserPreferences;
}

export interface PlanGenerationResponse {
  goal: Goal;
  milestones: Milestone[];
  initialTasks: Task[];
  knowledgeGraph: SkillNode[];
  curatedResources: CuratedResource[];
  estimatedTimeToComplete: number;
  confidence: number;
}

export interface InterventionRequest {
  goalId: string;
  trigger: 'failure' | 'engagement' | 'time' | 'manual';
  context?: Record<string, any>;
}

export interface VoiceBrainDumpRequest {
  audioUrl?: string; // or base64
  transcript?: string;
  goalId?: string;
}