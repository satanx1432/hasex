# DATABASE SCHEMA - SIMPLIFIED ONE PAGE APP

## CORE PHILOSOPHY

**Schema designed for:**
- Daily challenges
- User adaptation
- Evidence of change
- AI memory
- Simple retrieval

## SCHEMA (Supabase PostgreSQL)

### Table: users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  state TEXT DEFAULT 'new_user', -- new_user, active_user, stuck_user, paused_user, quit_user
  current_goal TEXT,
  total_challenges_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  
  INDEX idx_state (state),
  INDEX idx_last_active (last_active)
);
```

### Table: challenges

```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL, -- easy, medium, hard
  time_estimate_minutes INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, skipped, adapted
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  next_challenge_id UUID, -- For chaining
  
  INDEX idx_user_status (user_id, status),
  INDEX idx_next_challenge (next_challenge_id)
);
```

### Table: challenge_steps

```sql
CREATE TABLE challenge_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  
  INDEX idx_challenge (challenge_id)
);
```

### Table: evidence_of_change

```sql
CREATE TABLE evidence_of_change (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  trait TEXT NOT NULL, -- Becoming: disciplined, consistent, curious, etc.
  previous_state TEXT,
  new_state TEXT,
  evidence_description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_trait (user_id, trait),
  INDEX idx_created_at (created_at)
);
```

### Table: ai_memory

```sql
CREATE TABLE ai_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL, -- goal, preference, struggle, strength, pattern
  content TEXT NOT NULL,
  confidence REAL DEFAULT 1.0, -- 0-1 how sure AI is
  last_accessed TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_type (user_id, memory_type)
);
```

### Table: daily_sessions

```sql
CREATE TABLE daily_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  challenge_count INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  mood_before TEXT, -- happy, neutral, stressed, tired, etc.
  mood_after TEXT,
  session_notes TEXT,
  
  INDEX idx_user_date (user_id, session_date)
);
```

### Table: traits_developing

```sql
CREATE TABLE traits_developing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trait TEXT NOT NULL,
  development_level REAL DEFAULT 0.0, -- 0-1
  evidence_count INTEGER DEFAULT 0,
  last_evidenced TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_trait (user_id, trait)
);
```

## DATA FLOW

### Challenge Creation

```
User asks for goal → AI stores in ai_memory → AI generates challenge → Stored in challenges
```

### Challenge Completion

```
User completes → Update challenges → Generate evidence_of_change → Update traits_developing → Create daily_session → Generate next challenge
```

### Adaptation

```
User can't complete → Update challenges (status: adapted) → Store struggle in ai_memory → AI generates easier challenge
```

### Daily Return

```
User opens app → Check daily_sessions for today → If none: create session → Get pending challenge → Show challenge
```

## KEY INDEXES FOR PERFORMANCE

```sql
-- For daily challenge retrieval
CREATE INDEX idx_user_pending_challenges ON challenges(user_id, status) 
WHERE status = 'pending';

-- For trait development tracking
CREATE INDEX idx_user_trait_development ON traits_developing(user_id, development_level);

-- For evidence retrieval
CREATE INDEX idx_user_evidence_dates ON evidence_of_change(user_id, created_at);

-- For AI memory fast access
CREATE INDEX idx_user_memory_access ON ai_memory(user_id, last_accessed);
```

## SUPABASE RLS POLICIES

```sql
-- Users can only access their own data
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_challenges ON challenges
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE evidence_of_change ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_evidence ON evidence_of_change
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_memory ON ai_memory
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);
```

## SIMPLIFIED TRIGGERS

### Trigger: Update user streak on challenge completion

```sql
CREATE OR REPLACE FUNCTION update_streak()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE users 
    SET 
      total_challenges_completed = total_challenges_completed + 1,
      current_streak = current_streak + 1,
      last_active = NOW()
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_streak
  AFTER UPDATE OF status ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_streak();
```

### Trigger: Update trait development on evidence

```sql
CREATE OR REPLACE FUNCTION update_trait_development()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO traits_developing (user_id, trait, development_level, evidence_count, last_evidenced)
  VALUES (
    NEW.user_id, 
    NEW.trait, 
    0.1, -- Initial boost
    1,
    NOW()
  )
  ON CONFLICT (user_id, trait) 
  DO UPDATE SET
    development_level = LEAST(traits_developing.development_level + 0.1, 1.0),
    evidence_count = traits_developing.evidence_count + 1,
    last_evidenced = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trait
  AFTER INSERT ON evidence_of_change
  FOR EACH ROW EXECUTE FUNCTION update_trait_development();
```

## STORAGE CONSIDERATIONS

### Challenge Archive
- Archive completed challenges after 90 days
- Keep evidence_of_change indefinitely
- Keep ai_memory indefinitely

### Performance
- Current challenge query: <50ms
- Evidence retrieval: <100ms
- Trait calculation: <200ms

### Scaling
- Expected: 10,000 users
- Peak concurrent: 1,000
- Daily sessions: ~5,000
- Challenge table: ~1M rows/month

## MIGRATION PATH

### From existing schema
1. Create new tables
2. Migrate existing users to users table
3. Convert existing goals to first challenges
4. Archive old goal planning data
5. Delete old complex schema

### Rollback plan
1. Keep old schema in backup
2. Data can be migrated back
3. No data loss guaranteed

## INDEXES FOR AI

### Vector embeddings for challenge similarity
```sql
-- If we want similar challenges recommendation
CREATE TABLE challenge_embeddings (
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  embedding VECTOR(1024) -- pgvector for BGE-M3
);

CREATE INDEX idx_challenge_embedding ON challenge_embeddings 
USING ivfflat (embedding vector_cosine_ops);
```

### Full-text search for challenges
```sql
CREATE TABLE challenge_search (
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  content TEXT
);

CREATE INDEX idx_challenge_content ON challenge_search 
USING gin(to_tsvector('english', content));
```

This schema supports the ONE PAGE app with minimal complexity while enabling the AI to adapt and show evidence of change.
