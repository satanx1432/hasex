CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');
CREATE TYPE roadmap_status AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE difficulty_level AS ENUM ('low', 'medium', 'high');

-- Profiles: user profiles (triggered on auth.signUp)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Goals: top-level user goals (source of truth for "what" they want to achieve)
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  classification JSONB, -- { type, complexity, confidence }
  status goal_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Destinations: AI destination generated from the goal
CREATE TABLE IF NOT EXISTS destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  destination_text TEXT NOT NULL,
  duration TEXT NOT NULL,
  complexity difficulty_level NOT NULL DEFAULT 'medium',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Roadmaps: collection of stages for a destination
CREATE TABLE IF NOT EXISTS roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  destination_id UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  status roadmap_status DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Stages within a roadmap
CREATE TABLE IF NOT EXISTS roadmap_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks: atomic daily actions derived from a stage
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES roadmap_stages(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  if_then_plan TEXT,
  difficulty_score INT NOT NULL DEFAULT 5,
  estimated_minutes INT,
  status task_status DEFAULT 'pending',
  scheduled_for DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Task completions: record when a user completes a task (daily check-ins)
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('completed','partially','skipped')),
  what_helped TEXT,
  what_got_in_way TEXT,
  energy_level INT CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 10))
);

-- Row-level security policies
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Goals: users see only their goals
CREATE POLICY "goals_select_policy" ON goals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "goals_insert_policy" ON goals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_update_policy" ON goals FOR UPDATE USING (user_id = auth.uid());

-- Destinations
CREATE POLICY "dest_select_policy" ON destinations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "dest_insert_policy" ON destinations FOR INSERT WITH CHECK (user_id = auth.uid());

-- Roadmaps
CREATE POLICY "roadmap_select_policy" ON roadmaps FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "roadmap_insert_policy" ON roadmaps FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "roadmap_update_policy" ON roadmaps FOR UPDATE USING (user_id = auth.uid());

-- Roadmap stages
CREATE POLICY "stages_select_policy" ON roadmap_stages FOR SELECT USING (
  EXISTS (SELECT 1 FROM roadmaps r WHERE r.id = roadmap_stages.roadmap_id AND r.user_id = auth.uid())
);
CREATE POLICY "stages_insert_policy" ON roadmap_stages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM roadmaps r WHERE r.id = roadmap_stages.roadmap_id AND r.user_id = auth.uid())
);

-- Tasks
CREATE POLICY "tasks_select_policy" ON tasks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tasks_insert_policy" ON tasks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "tasks_update_policy" ON tasks FOR UPDATE USING (user_id = auth.uid());

-- Task completions
CREATE POLICY "completions_select_policy" ON task_completions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "completions_insert_policy" ON task_completions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Trigger to create profile on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
