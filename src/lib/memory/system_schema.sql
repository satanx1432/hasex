"""
Memory System Database Schema for Adaptive User Modeling
"""

# ============================================================
# MEMORY LAYER 1: EPISODIC MEMORY
# Question: "What happened?"
# ============================================================

CREATE TABLE episodic_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Event identification
    event_type TEXT NOT NULL, -- 'milestone', 'failure', 'win', 'behavior_change', 'emotional_moment', 'decision', 'commitment'
    summary TEXT NOT NULL,
    raw_evidence TEXT, -- Original conversation snippet
    
    -- Scoring
    importance_score REAL NOT NULL, -- 0-1, how important is this event
    confidence REAL NOT NULL DEFAULT 0.5, -- 0-1, how sure are we this happened
    decay_rate REAL NOT NULL DEFAULT 0.95, -- Confidence decay per day
    
    -- Temporal
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Vector search
    embedding VECTOR(1024), -- Text embedding of summary + evidence
    
    -- Relationships
    related_memories UUID[] REFERENCES episodic_memories(id),
    
    -- Metadata
    metadata JSONB, -- Additional contextual information
    
    CONSTRAINT valid_importance CHECK (importance_score >= 0 AND importance_score <= 1),
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX idx_episodic_user ON episodic_memories(user_id);
CREATE INDEX idx_episodic_importance ON episodic_memories(importance_score DESC);
CREATE INDEX idx_episodic_embedding ON episodic_memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_episodic_decay ON episodic_memories(decay_rate);
CREATE INDEX idx_episodic_timestamp ON episodic_memories(timestamp DESC);

# ============================================================
# MEMORY LAYER 2: SEMANTIC MEMORY
# Question: "Who is this person?"
# ============================================================

CREATE TABLE semantic_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Trait identification
    trait TEXT NOT NULL, -- 'goal', 'motivation', 'fear', 'strength', 'weakness', 'personality_trait', 'excuse', 'psychological_bottleneck', 'coaching_style', 'productivity_pattern'
    value TEXT NOT NULL, -- What the trait value is
    confidence REAL NOT NULL DEFAULT 0.5, -- 0-1, how sure are we
    
    -- Evidence
    supporting_evidence TEXT[], -- Examples that support this belief
    contradictions TEXT[], -- Evidence that contradicts this belief
    
    -- Temporal
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_observed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Decay
    decay_rate REAL NOT NULL DEFAULT 0.97,
    
    -- Vector search
    embedding VECTOR(1024), -- Embedding of trait + value
    
    -- Metadata
    metadata JSONB,
    
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1),
    CONSTRAINT valid_decay_rate CHECK (decay_rate >= 0 AND decay_rate <= 1)
);

CREATE UNIQUE INDEX idx_semantic_user_trait ON semantic_memories(user_id, trait);
CREATE INDEX idx_semantic_confidence ON semantic_memories(confidence DESC);
CREATE INDEX idx_semantic_embedding ON semantic_memories USING ivfllat (embedding vector_cosine_ops);
CREATE INDEX idx_semantic_updated ON semantic_memories(last_updated DESC);

# ============================================================
# MEMORY LAYER 3: BEHAVIORAL MEMORY
# Question: "How do they act?"
# ============================================================

CREATE TABLE behavioral_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Behavior identification
    behavior_type TEXT NOT NULL, -- 'consistency', 'procrastination_pattern', 'follow_through_rate', 'abandonment_pattern', 'productive_hours', 'response_to_pressure', 'intervention_success', 'intervention_failure'
    observation TEXT NOT NULL,
    
    -- Quantification
    frequency REAL, -- How often does this happen (if applicable)
    confidence REAL NOT NULL DEFAULT 0.5,
    
    -- Temporal
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trend TEXT, -- 'improving', 'stable', 'declining'
    
    -- Decay
    decay_rate REAL NOT NULL DEFAULT 0.96,
    
    -- Vector search
    embedding VECTOR(1024),
    
    -- Metadata
    metadata JSONB,
    
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1),
    CONSTRAINT valid_decay_rate CHECK (decay_rate >= 0 AND decay_rate <= 1)
);

CREATE INDEX idx_behavioral_user ON behavioral_memories(user_id);
CREATE INDEX idx_behavioral_type ON behavioral_memories(behavior_type);
CREATE INDEX idx_behavioral_confidence ON behavioral_memories(confidence DESC);
CREATE INDEX idx_behavioral_embedding ON behavioral_memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_behavioral_trend ON behavioral_memories(trend);
CREATE INDEX idx_behavioral_seen ON behavioral_memories(last_seen DESC);

# ============================================================
# MEMORY RELATIONSHIPS & CHANGES
# ============================================================

CREATE TABLE memory_evolution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_id UUID NOT NULL, -- Can be from any memory table
    memory_type TEXT NOT NULL, -- 'episodic', 'semantic', 'behavioral'
    
    -- Change tracking
    confidence_before REAL NOT NULL,
    confidence_after REAL NOT NULL,
    confidence_delta REAL NOT NULL,
    
    -- Change reason
    change_reason TEXT NOT NULL, -- 'new_evidence', 'contradiction', 'decay', 'strengthening'
    triggering_conversation_id TEXT, -- Link to conversation
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_evolution_user ON memory_evolution(user_id);
CREATE INDEX idx_evolution_memory ON memory_evolution(memory_id);
CREATE INDEX idx_evolution_timestamp ON memory_evolution(timestamp DESC);

# ============================================================
# CONVERSATION EXTRACTION LOG
# ============================================================

CREATE TABLE conversation_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL,
    
    -- Extraction results
    extracted_events JSONB, -- Events detected in conversation
    updated_memories JSONB, -- Which memories were updated
    new_memories_created JSONB, -- New memories created
    contradictions_detected JSONB, -- Contradictions found
    confidence_updates JSONB, -- Confidence changes made
    
    -- Scoring
    extraction_confidence REAL NOT NULL, -- How confident are we in our extraction
    
    -- Temporal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB
);

CREATE INDEX idx_extraction_user_conv ON conversation_extractions(user_id, conversation_id);
CREATE INDEX idx_extraction_timestamp ON conversation_extractions(created_at DESC);

# ============================================================
# DAILY DECAY JOB
# ============================================================

CREATE TABLE decay_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_date DATE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    processed_count INTEGER DEFAULT 0,
    error_log TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE (job_date)
);

CREATE INDEX idx_decay_date ON decay_jobs(job_date);

# ============================================================
# TRIGGERS
# ============================================================

-- Function to apply decay to memories
CREATE OR REPLACE FUNCTION apply_decay()
RETURNS TRIGGER AS $$
BEGIN
    -- Decay episodic memories
    UPDATE episodic_memories
    SET 
        confidence = GREATEST(confidence * decay_rate, 0.01),
        last_accessed = NOW()
    WHERE last_accessed < NOW() - INTERVAL '1 day';
    
    -- Decay semantic memories
    UPDATE semantic_memories
    SET 
        confidence = GREATEST(confidence * decay_rate, 0.01),
        last_updated = NOW()
    WHERE last_updated < NOW() - INTERVAL '1 day';
    
    -- Decay behavioral memories
    UPDATE behavioral_memories
    SET 
        confidence = GREATEST(confidence * decay_rate, 0.01),
        last_seen = NOW()
    WHERE last_seen < NOW() - INTERVAL '1 day';
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for daily decay
CREATE TRIGGER trigger_apply_decay
    BEFORE UPDATE ON users
    FOR EACH ROW
EXECUTE FUNCTION apply_decay();

-- Alternative: Daily job function
CREATE OR REPLACE FUNCTION process_daily_decay(job_date DATE)
RETURNS VOID AS $$
BEGIN
    -- Apply decay to all memories
    PERFORM apply_decay();
    
    -- Update decay job status
    UPDATE decay_jobs 
    SET 
        status = 'completed',
        completed_at = NOW(),
        processed_count = (SELECT COUNT(*) FROM episodic_memories WHERE confidence > 0.1)
    WHERE job_date = job_date AND status = 'pending';
    
    RAISE NOTICE 'Processed daily decay for date: %', job_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
# USEFUL VIEWS
# ============================================================

-- View: Current user profile
CREATE OR REPLACE VIEW current_user_profile AS
SELECT 
    u.id as user_id,
    u.name,
    u.state,
    u.current_goal,
    
    -- Semantic traits
    (SELECT jsonb_agg(jsonb_build_object(
        'trait', trait,
        'value', value,
        'confidence', confidence
    )) 
    FROM semantic_memories 
    WHERE user_id = u.id AND confidence > 0.5
    GROUP BY user_id) as traits,
    
    -- Recent important events
    (SELECT jsonb_agg(jsonb_build_object(
        'event_type', event_type,
        'summary', summary,
        'confidence', confidence,
        'timestamp', timestamp
    )) 
    FROM episodic_memories 
    WHERE user_id = u.id AND importance_score > 0.6
    AND timestamp > NOW() - INTERVAL '30 days'
    GROUP BY user_id) as recent_events,
    
    -- Behavioral patterns
    (SELECT jsonb_agg(jsonb_build_object(
        'behavior_type', behavior_type,
        'observation', observation,
        'confidence', confidence,
        'trend', trend
    )) 
    FROM behavioral_memories
    WHERE user_id = u.id AND confidence > 0.5
    GROUP BY user_id) as behaviors
    
FROM users u;
