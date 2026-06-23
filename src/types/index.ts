// User Types
export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

// Goal Types
export interface Goal {
  id: string
  user_id: string
  title: string
  description?: string
  created_at: string
  updated_at: string
  status: 'active' | 'completed' | 'paused'
}

// Action Types
export interface MicroAction {
  id: string
  goal_id: string
  user_id: string
  title: string
  description: string
  if_then_plan: string
  difficulty_score: number
  estimated_time_minutes: number
  created_at: string
  status: 'pending' | 'selected' | 'completed' | 'skipped'
}

// Action Completion Types
export interface ActionCompletion {
  id: string
  action_id: string
  user_id: string
  completed_at: string
  confidence_score?: number
  effort_rating?: number
  emotional_state?: string
  barriers?: string
  facilitators?: string
}

// BOS Insight Types
export interface BOSInsight {
  id: string
  user_id: string
  insight_type: 'motivational' | 'behavioral' | 'progress' | 'intervention'
  title: string
  content: string
  actionable_suggestion?: string
  created_at: string
  read: boolean
}

// AI Request Types
export interface GenerateActionRequest {
  goal: string
  user_history?: {
    completed_actions: number
    success_rate: number
    common_barriers: string[]
    recent_performance?: {
      success_rate: number
      recent_streak: number
      last_action_difficulty: number
      missed_actions: number
    }
  }
  context?: {
    time_of_day: string
    day_of_week: string
    energy_level?: string
    performance_context?: string
  }
}

export interface GenerateActionResponse {
  actions: MicroAction[]
  recommended_action: number
  reasoning: string
}

export interface FeedbackAnalysisRequest {
  feedback: string
  action_id: string
  user_state?: {
    confidence_score: number
    effort_rating: number
  }
}

export interface FeedbackAnalysisResponse {
  sentiment: 'positive' | 'neutral' | 'negative'
  barrier_categories: string[]
  facilitator_categories: string[]
  suggested_adjustments: string[]
  motivational_message: string
}
