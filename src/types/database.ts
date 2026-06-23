export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DifficultyLevel = 'low' | 'medium' | 'high';
export type GoalStatus = 'active' | 'completed' | 'paused';
export type RoadmapStatus = 'active' | 'completed' | 'abandoned';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type CompletionStatus = 'completed' | 'partially' | 'skipped';
export type CognitiveLoadStatus = 'normal' | 'elevated' | 'overloaded';
export type LockStatus = 'unlocked' | 'locked';
export type RewardType = 'visual' | 'functional' | 'badge' | 'milestone';
export type ChallengeStatus = 'active' | 'completed' | 'expired';
export type WebhookStatus = 'active' | 'paused' | 'failed';
export type QuestionType = 'clarification' | 'assessment' | 'feedback' | 'cognitive_load';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          created_at: string | null;
          preferences: Json | null;
          gamification_enabled: boolean | null;
          notification_preferences: Json | null;
        };
        Insert: {
          id: string;
          name?: string | null;
          email: string;
          created_at?: string | null;
          preferences?: Json | null;
          gamification_enabled?: boolean | null;
          notification_preferences?: Json | null;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string;
          created_at?: string | null;
          preferences?: Json | null;
          gamification_enabled?: boolean | null;
          notification_preferences?: Json | null;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          classification: Json | null;
          status: GoalStatus | null;
          priority_score: number | null;
          created_at: string | null;
          updated_at: string | null;
          target_completion_date: string | null;
        };
      };
      destinations: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          destination_text: string;
          duration: string;
          complexity: DifficultyLevel | null;
          reason: string | null;
          created_at: string | null;
        };
      };
      roadmaps: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          destination_id: string;
          status: RoadmapStatus | null;
          started_at: string | null;
          completed_at: string | null;
        };
      };
      roadmap_stages: {
        Row: {
          id: string;
          roadmap_id: string;
          user_id: string;
          title: string;
          description: string | null;
          sort_order: number;
          category: string | null;
          created_at: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          stage_id: string;
          goal_id: string;
          title: string;
          description: string | null;
          if_then_plan: string | null;
          difficulty_score: number | null;
          estimated_minutes: number | null;
          status: TaskStatus | null;
          scheduled_for: string | null;
          created_at: string | null;
          adaptive_frequency: string | null;
          learning_resources: Json | null;
        };
      };
      task_completions: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          completed_at: string | null;
          status: CompletionStatus;
          what_helped: string | null;
          what_got_in_way: string | null;
          energy_level: number | null;
          quiz_score: number | null;
          quiz_attempts: number | null;
          mastery_level: string | null;
        };
      };
      follow_up_questions: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          task_id: string | null;
          question_type: QuestionType;
          question_text: string;
          answer_options: Json | null;
          correct_answer: string | null;
          answer: string | null;
          is_answered: boolean | null;
          created_at: string | null;
          answered_at: string | null;
        };
      };
      cognitive_load_assessments: {
        Row: {
          id: string;
          user_id: string;
          assessment_date: string;
          status: CognitiveLoadStatus;
          score: number;
          responses: Json;
          lock_until: string | null;
          lock_reason: string | null;
          created_at: string | null;
        };
      };
      learning_content: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content_type: string;
          title: string;
          content: string;
          source_url: string | null;
          quality_rating: number | null;
          created_at: string | null;
        };
      };
      quiz_questions: {
        Row: {
          id: string;
          task_id: string;
          learning_content_id: string | null;
          question_text: string;
          options: Json;
          correct_answer: number;
          explanation: string;
          difficulty: number;
          created_at: string | null;
        };
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          task_id: string;
          question_id: string;
          selected_answer: number;
          is_correct: boolean;
          attempt_number: number;
          completed_at: string | null;
        };
      };
      time_allocations: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          day_of_week: string;
          allocated_minutes: number;
          preferred_time_start: string | null;
          preferred_time_end: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
      };
      gamification_rewards: {
        Row: {
          id: string;
          user_id: string;
          reward_type: RewardType;
          title: string;
          description: string | null;
          icon_url: string | null;
          unlocked_at: string | null;
          achievement_criteria: Json | null;
          created_at: string | null;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          reward_id: string;
          unlocked_at: string;
          progress: number;
          metadata: Json | null;
        };
      };
      social_challenges: {
        Row: {
          id: string;
          title: string;
          description: string;
          challenge_type: string;
          start_date: string;
          end_date: string;
          participants: number;
          status: ChallengeStatus;
          created_at: string | null;
        };
      };
      challenge_participants: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          joined_at: string;
          progress: number;
          completed_at: string | null;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          event_data: Json;
          session_id: string | null;
          created_at: string | null;
        };
      };
      performance_metrics: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string | null;
          metric_date: string;
          completion_rate: number;
          streak_days: number;
          total_tasks_completed: number;
          average_difficulty: number;
          average_energy_level: number;
          cognitive_load_incidents: number;
          created_at: string | null;
        };
      };
      behavioral_patterns: {
        Row: {
          id: string;
          user_id: string;
          pattern_type: string;
          pattern_data: Json;
          confidence_score: number;
          last_detected: string;
          created_at: string | null;
        };
      };
      webhooks: {
        Row: {
          id: string;
          user_id: string;
          endpoint_url: string;
          secret: string;
          events: Json;
          status: WebhookStatus;
          last_triggered: string | null;
          failure_count: number;
          created_at: string | null;
        };
      };
      webhook_logs: {
        Row: {
          id: string;
          webhook_id: string;
          event_type: string;
          payload: Json;
          response_status: number | null;
          response_body: string | null;
          triggered_at: string;
          success: boolean;
        };
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          key_name: string;
          key_hash: string;
          scopes: Json;
          last_used: string | null;
          expires_at: string | null;
          created_at: string | null;
        };
      };
    };
  };
}
