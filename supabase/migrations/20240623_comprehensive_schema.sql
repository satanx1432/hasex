-- Comprehensive Behavioral OS Database Schema
-- This migration adds all tables needed for the full-featured Behavioral OS

-- Update profiles table with new fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB,
ADD COLUMN IF NOT EXISTS gamification_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB;

-- Update goals table with new fields
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS priority_score INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS target_completion_date TIMESTAMP WITH TIME ZONE;

-- Update tasks table with new fields
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS adaptive_frequency VARCHAR(50),
ADD COLUMN IF NOT EXISTS learning_resources JSONB;

-- Update task_completions table with new fields
ALTER TABLE task_completions
ADD COLUMN IF NOT EXISTS quiz_score INTEGER,
ADD COLUMN IF NOT EXISTS quiz_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mastery_level VARCHAR(50);

-- Follow-up questions for AI adaptive system
CREATE TABLE IF NOT EXISTS follow_up_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('clarification', 'assessment', 'feedback', 'cognitive_load')),
  question_text TEXT NOT NULL,
  answer_options JSONB,
  correct_answer TEXT,
  answer TEXT,
  is_answered BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answered_at TIMESTAMP WITH TIME ZONE
);

-- Cognitive load assessments and lock system
CREATE TABLE IF NOT EXISTS cognitive_load_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) NOT NULL CHECK (status IN ('normal', 'elevated', 'overloaded')),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  responses JSONB NOT NULL,
  lock_until TIMESTAMP WITH TIME ZONE,
  lock_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning content storage
CREATE TABLE IF NOT EXISTS learning_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz questions for learning verification
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  learning_content_id UUID REFERENCES learning_content(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz attempts tracking
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempt_number INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time allocation for multi-goal scheduling
CREATE TABLE IF NOT EXISTS time_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  allocated_minutes INTEGER NOT NULL CHECK (allocated_minutes > 0),
  preferred_time_start TIME,
  preferred_time_end TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gamification rewards
CREATE TABLE IF NOT EXISTS gamification_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('visual', 'functional', 'badge', 'milestone')),
  title TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  achievement_criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements tracking
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES gamification_rewards(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  metadata JSONB
);

-- Social challenges
CREATE TABLE IF NOT EXISTS social_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type VARCHAR(100) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  participants INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenge participants
CREATE TABLE IF NOT EXISTS challenge_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID REFERENCES social_challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Analytics events for comprehensive tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  session_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics aggregation
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
  metric_date DATE NOT NULL,
  completion_rate DECIMAL(5,2),
  streak_days INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  average_difficulty DECIMAL(3,2),
  average_energy_level DECIMAL(3,2),
  cognitive_load_incidents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Behavioral patterns detection
CREATE TABLE IF NOT EXISTS behavioral_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type VARCHAR(100) NOT NULL,
  pattern_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  last_detected TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhooks for external integrations
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events JSONB NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'paused', 'failed')),
  last_triggered TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook execution logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN NOT NULL
);

-- API keys for external access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name VARCHAR(100) NOT NULL,
  key_hash TEXT NOT NULL,
  scopes JSONB NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_follow_up_questions_user_id ON follow_up_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_questions_goal_id ON follow_up_questions(goal_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_questions_task_id ON follow_up_questions(task_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_load_user_id ON cognitive_load_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_load_date ON cognitive_load_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_learning_content_task_id ON learning_content(task_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_task_id ON quiz_questions(task_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_task ON quiz_attempts(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_time_allocations_user_goal ON time_allocations(user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_gamification_rewards_user_id ON gamification_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_reward ON user_achievements(user_id, reward_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_date ON performance_metrics(user_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_behavioral_patterns_user_type ON behavioral_patterns(user_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_user_status ON webhooks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- Enable Row Level Security
ALTER TABLE follow_up_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_load_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own follow-up questions" ON follow_up_questions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own follow-up questions" ON follow_up_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own follow-up questions" ON follow_up_questions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own cognitive load assessments" ON cognitive_load_assessments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cognitive load assessments" ON cognitive_load_assessments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own learning content" ON learning_content
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learning content" ON learning_content
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own quiz attempts" ON quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own time allocations" ON time_allocations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time allocations" ON time_allocations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time allocations" ON time_allocations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own gamification rewards" ON gamification_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own performance metrics" ON performance_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own behavioral patterns" ON behavioral_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own webhooks" ON webhooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhooks" ON webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks" ON webhooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own webhook logs" ON webhook_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);